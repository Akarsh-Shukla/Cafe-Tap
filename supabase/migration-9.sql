-- ============================================================================
-- migration-9: staff approval of orders, kitchen screen, daily sales register (Basic), staff for both plans, data retention.
-- Run AFTER migrations 5, 6, 7 and 8, in the same Supabase project (staging first). Untested until you run supabase/tests/pos_tests.sql.
-- ============================================================================
do $$ begin
  if to_regclass('public.payment_events') is null or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cafes' and column_name = 'plan_tier') then
    raise exception 'Run migrations 5 and 6 first in THIS Supabase project. Use supabase/check_setup.sql to see what is missing.';
  end if;
end $$;

-- 1) new permissions and the new "pending" order status
alter table cafe_members add column if not exists can_kitchen boolean not null default false;
alter table cafe_members add column if not exists can_register boolean not null default false;
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in ('pending','received','preparing','ready','completed','cancelled'));

-- 2) permission helpers
create or replace function staff_can(cid uuid, perm text) returns boolean language sql security definer stable set search_path = public as $$
  select cafe_has_pos(cid) and (owns_cafe(cid) or exists (
    select 1 from cafe_members m where m.cafe_id = cid and m.user_id = auth.uid() and m.active and
      case perm when 'orders' then m.can_orders when 'payments' then m.can_payments when 'close' then m.can_close
                when 'reports' then m.can_reports when 'kitchen' then m.can_kitchen else false end)) $$;
-- the manual sales register belongs to the BASIC plan (POS records sales automatically); never the platform admin
create or replace function register_access(cid uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from cafes c where c.id = cid and c.plan_tier = 'basic' and not c.suspended and
    (c.owner_id = auth.uid() or exists (select 1 from cafe_members m where m.cafe_id = c.id and m.user_id = auth.uid() and m.active and m.can_register))) $$;

-- 3) the kitchen screen reads orders but never bills or payments
drop policy if exists "pos read sessions" on table_sessions;
create policy "pos read sessions" on table_sessions for select to authenticated using (staff_can(cafe_id, 'orders') or staff_can(cafe_id, 'kitchen'));
drop policy if exists "pos read orders" on orders;
create policy "pos read orders" on orders for select to authenticated using (staff_can(cafe_id, 'orders') or staff_can(cafe_id, 'kitchen'));
drop policy if exists "pos read items" on order_items;
create policy "pos read items" on order_items for select to authenticated using (staff_can(cafe_id, 'orders') or staff_can(cafe_id, 'kitchen'));
drop policy if exists "staff read tables" on cafe_tables;
create policy "staff read tables" on cafe_tables for select to authenticated using (staff_can(cafe_id, 'orders') or staff_can(cafe_id, 'kitchen'));

-- 4) order creation: guest orders start as 'pending' and only count on the bill once staff approve them
create or replace function _pos_create_order(p_cafe uuid, p_table uuid, p_source text, p_idem text, p_items jsonb, p_note text, p_cap uuid, p_actor uuid, p_expected bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ex orders%rowtype; v_lines jsonb; v_total bigint; v_sess uuid; v_bill uuid; v_bstat text; v_sstat text;
  v_order uuid; v_ref text; v_try int := 0; v_loop int := 0; v_note text;
  v_status text := case when p_source = 'customer' then 'pending' else 'received' end;   -- guests' orders wait for staff approval
begin
  if p_idem is null or p_idem !~ '^[A-Za-z0-9_-]{16,64}$' then return _fail('invalid'); end if;
  -- duplicate submit / network retry: return the order that already exists
  select * into v_ex from orders where cafe_id = p_cafe and idempotency_key = p_idem;
  if v_ex.id is not null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'ref', v_ex.ref, 'status', v_ex.status, 'total_minor', v_ex.total_minor);
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then return _fail('invalid'); end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where jsonb_typeof(e) <> 'object' or coalesce(e->>'id', '') !~ '^[0-9a-fA-F-]{36}$' or coalesce(e->>'qty', '') !~ '^[0-9]{1,2}$') then return _fail('invalid'); end if;

  -- prices and names come from OUR menu table, never from the browser
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'qty', r.qty, 'name', m.name, 'price', m.price_paise,
           'ok', (m.id is not null and m.is_available and coalesce(c.is_visible, false)))), '[]'::jsonb)
    into v_lines
  from (select (e->>'id')::uuid as id, sum((e->>'qty')::int)::int as qty from jsonb_array_elements(p_items) e group by 1) r
  left join menu_items m on m.id = r.id and m.cafe_id = p_cafe
  left join menu_categories c on c.id = m.category_id;

  if exists (select 1 from jsonb_array_elements(v_lines) l where (l->>'qty')::int not between 1 and 20) then return _fail('invalid'); end if;
  if (select sum((l->>'qty')::int) from jsonb_array_elements(v_lines) l) > 60 then return _fail('invalid'); end if;
  if exists (select 1 from jsonb_array_elements(v_lines) l where not (l->>'ok')::boolean) then
    return jsonb_build_object('ok', false, 'reason', 'unavailable',
      'names', (select coalesce(jsonb_agg(l->>'name'), '[]'::jsonb) from jsonb_array_elements(v_lines) l where not (l->>'ok')::boolean));
  end if;
  select coalesce(sum((l->>'qty')::bigint * (l->>'price')::bigint), 0) into v_total from jsonb_array_elements(v_lines) l;
  if v_total > 10000000 then return _fail('invalid'); end if;
  if p_expected is not null and p_expected <> v_total then
    return jsonb_build_object('ok', false, 'reason', 'price_changed', 'total_minor', v_total);
  end if;
  v_note := nullif(left(btrim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]', ' ', 'g')), 140), '');

  -- get-or-create the ONE open session and its bill; the bill row lock serialises concurrent orders and closing
  loop
    v_loop := v_loop + 1;
    insert into table_sessions (cafe_id, table_id, opened_by) values (p_cafe, p_table, p_actor)
      on conflict (table_id) where status = 'open' do nothing;
    select id into v_sess from table_sessions where table_id = p_table and status = 'open';
    if v_sess is not null then
      insert into bills (cafe_id, session_id) values (p_cafe, v_sess) on conflict (session_id) do nothing;
      select id, status into v_bill, v_bstat from bills where session_id = v_sess for update;
      select status into v_sstat from table_sessions where id = v_sess;
      exit when v_bstat = 'open' and v_sstat = 'open';
    end if;
    if v_loop >= 3 then return _fail('busy'); end if;
  end loop;

  loop
    v_ref := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into orders (cafe_id, session_id, bill_id, ref, status, source, idempotency_key, capability_id, note, total_minor, created_by)
        values (p_cafe, v_sess, v_bill, v_ref, v_status, p_source, p_idem, p_cap, v_note, v_total, p_actor) returning id into v_order;
      exit;
    exception when unique_violation then
      select * into v_ex from orders where cafe_id = p_cafe and idempotency_key = p_idem;
      if v_ex.id is not null then
        return jsonb_build_object('ok', true, 'duplicate', true, 'ref', v_ex.ref, 'status', v_ex.status, 'total_minor', v_ex.total_minor);
      end if;
      v_try := v_try + 1;
      if v_try > 5 then return _fail('busy'); end if;
    end;
  end loop;

  insert into order_items (cafe_id, order_id, menu_item_id, name_snapshot, unit_price_minor, quantity, line_total_minor)
    select p_cafe, v_order, (l->>'id')::uuid, l->>'name', (l->>'price')::int, (l->>'qty')::int, (l->>'qty')::bigint * (l->>'price')::bigint
    from jsonb_array_elements(v_lines) l;
  if v_status = 'received' then update bills set total_minor = total_minor + v_total where id = v_bill; end if;   -- pending orders join the bill only when approved
  if p_source = 'staff' then perform _audit(p_cafe, 'pos', 'order.counter_created', v_ref, jsonb_build_object('total_minor', v_total)); end if;
  return jsonb_build_object('ok', true, 'ref', v_ref, 'status', v_status, 'total_minor', v_total);
exception when data_exception then
  return _fail('invalid');
end $$;

-- 5) status changes, now with approval, a kitchen-only path, and automatic release of a table whose orders were all rejected
create or replace function pos_set_order_status(p_order uuid, p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; b bills%rowtype; v_front boolean; v_kitchen boolean; v_ok boolean;
begin
  select * into o from orders where id = p_order;
  if o.id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  v_front := staff_can(o.cafe_id, 'orders'); v_kitchen := staff_can(o.cafe_id, 'kitchen');
  if not (v_front or v_kitchen) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into b from bills where id = o.bill_id for update;
  select * into o from orders where id = p_order for update;
  if b.status <> 'open' then return _fail('closed'); end if;
  v_ok := (o.status = 'pending' and p_status in ('received', 'cancelled')) or (o.status = 'received' and p_status in ('preparing', 'cancelled'))
       or (o.status = 'preparing' and p_status in ('ready', 'cancelled')) or (o.status = 'ready' and p_status in ('completed', 'cancelled'));
  if not v_ok then return _fail('transition'); end if;
  -- kitchen-only staff may only move approved orders to preparing and ready
  if not v_front and not ((o.status = 'received' and p_status = 'preparing') or (o.status = 'preparing' and p_status = 'ready')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status = 'received' then
    update bills set total_minor = total_minor + o.total_minor where id = b.id;
  elsif p_status = 'cancelled' and o.status <> 'pending' then
    if b.paid_minor > b.total_minor - o.total_minor then return _fail('paid_exceeds'); end if;
    update bills set total_minor = total_minor - o.total_minor where id = b.id;
  end if;
  update orders set status = p_status, updated_at = now() where id = o.id;
  perform _audit(o.cafe_id, 'pos', 'order.' || p_status, o.ref, '{}');
  if p_status = 'cancelled' and not exists (select 1 from orders where session_id = o.session_id and status <> 'cancelled') then
    update table_sessions set status = 'closed', closed_at = now(), closed_by = auth.uid() where id = o.session_id and status = 'open';
    update bills set status = 'closed', closed_at = now() where id = b.id;
    perform _audit(o.cafe_id, 'pos', 'session.auto_closed', o.session_id::text, '{}');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- 6) closing a table needs every order completed or cancelled (pending counts as unfinished); sales exclude unapproved orders
create or replace function pos_close_session(p_session uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare b bills%rowtype; s table_sessions%rowtype;
begin
  select * into b from bills where session_id = p_session;
  if b.id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  perform _require(b.cafe_id, 'close');
  select * into b from bills where id = b.id for update;
  select * into s from table_sessions where id = p_session for update;
  if s.status <> 'open' or b.status <> 'open' then return _fail('closed'); end if;
  if exists (select 1 from orders where session_id = s.id and status in ('pending', 'received', 'preparing', 'ready')) then return _fail('open_orders'); end if;
  if b.total_minor <> b.paid_minor then return jsonb_build_object('ok', false, 'reason', 'unpaid', 'balance_minor', b.total_minor - b.paid_minor); end if;
  update table_sessions set status = 'closed', closed_at = now(), closed_by = auth.uid() where id = s.id;
  update bills set status = 'closed', closed_at = now() where id = b.id;
  perform _audit(b.cafe_id, 'pos', 'session.closed', s.id::text, jsonb_build_object('total_minor', b.total_minor));
  return jsonb_build_object('ok', true);
end $$;

create or replace function pos_sales_summary(p_cafe uuid, p_from date, p_to date) returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  perform _require(p_cafe, 'reports');
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 92 then return _fail('range'); end if;
  return jsonb_build_object('ok', true,
    'orders', (select count(*) from orders o where o.cafe_id = p_cafe and o.status not in ('pending', 'cancelled') and (o.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
    'billed_minor', (select coalesce(sum(o.total_minor), 0) from orders o where o.cafe_id = p_cafe and o.status not in ('pending', 'cancelled') and (o.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
    'cash_minor', (select coalesce(sum(amount_minor), 0) from payment_events where cafe_id = p_cafe and method = 'cash' and (recorded_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
    'upi_minor', (select coalesce(sum(amount_minor), 0) from payment_events where cafe_id = p_cafe and method = 'upi' and (recorded_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
    'top_items', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select i.name_snapshot as name, sum(i.quantity)::int as qty from order_items i join orders o on o.id = i.order_id
        where i.cafe_id = p_cafe and o.status not in ('pending', 'cancelled') and (o.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
        group by 1 order by 2 desc limit 5) t));
end $$;

-- 7) daily sales register for Basic cafés: cash + UPI per day, total calculated by the database, every change logged
create table if not exists sales_register (
  cafe_id uuid not null references cafes(id) on delete cascade,
  day date not null,
  cash_minor bigint not null default 0 check (cash_minor between 0 and 100000000),
  upi_minor bigint not null default 0 check (upi_minor between 0 and 100000000),
  total_minor bigint generated always as (cash_minor + upi_minor) stored,
  note text check (char_length(note) <= 140),
  updated_by uuid, updated_at timestamptz not null default now(),
  primary key (cafe_id, day)
);
create table if not exists sales_register_log (
  id bigint generated always as identity primary key,
  cafe_id uuid not null references cafes(id) on delete cascade,
  day date not null, cash_minor bigint not null, upi_minor bigint not null, note text,
  actor uuid, actor_email text, at timestamptz not null default now()
);
create index if not exists register_log_cafe on sales_register_log (cafe_id, at);
alter table sales_register enable row level security;
alter table sales_register_log enable row level security;
drop policy if exists "register read" on sales_register;
create policy "register read" on sales_register for select to authenticated using (register_access(cafe_id));
drop policy if exists "register log read" on sales_register_log;
create policy "register log read" on sales_register_log for select to authenticated using (owns_cafe(cafe_id));

create or replace function register_save(p_cafe uuid, p_day date, p_cash bigint, p_upi bigint, p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Asia/Kolkata')::date; v_email text; v_note text := nullif(left(btrim(coalesce(p_note, '')), 140), '');
begin
  if not register_access(p_cafe) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_day is null or p_day > v_today or p_day < v_today - 400 then return _fail('invalid'); end if;
  if p_cash is null or p_upi is null or p_cash < 0 or p_upi < 0 or p_cash > 100000000 or p_upi > 100000000 then return _fail('invalid'); end if;
  insert into sales_register (cafe_id, day, cash_minor, upi_minor, note, updated_by, updated_at) values (p_cafe, p_day, p_cash, p_upi, v_note, auth.uid(), now())
    on conflict (cafe_id, day) do update set cash_minor = excluded.cash_minor, upi_minor = excluded.upi_minor, note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
  select email into v_email from auth.users where id = auth.uid();
  insert into sales_register_log (cafe_id, day, cash_minor, upi_minor, note, actor, actor_email) values (p_cafe, p_day, p_cash, p_upi, v_note, auth.uid(), v_email);
  return jsonb_build_object('ok', true);
end $$;

-- 8) staff management for BOTH plans (replaces the POS-only versions). Basic: register only. POS: orders, kitchen, payments, close, reports.
drop function if exists pos_add_staff(uuid, text, boolean, boolean, boolean, boolean);
drop function if exists pos_update_staff(uuid, boolean, boolean, boolean, boolean, boolean);
drop function if exists pos_list_staff(uuid);

create or replace function staff_add(p_cafe uuid, p_email text, p_orders boolean, p_payments boolean, p_close boolean, p_reports boolean, p_kitchen boolean, p_register boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_pos boolean;
begin
  if not (owns_cafe(p_cafe) and exists (select 1 from cafes where id = p_cafe and not suspended)) then raise exception 'not allowed' using errcode = '42501'; end if;
  select (plan_tier = 'pos') into v_pos from cafes where id = p_cafe;
  select id into v_user from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) and email_confirmed_at is not null;
  if v_user is null then return _fail('no_account'); end if;
  if v_user = (select owner_id from cafes where id = p_cafe) or exists (select 1 from admins where user_id = v_user) then return _fail('invalid'); end if;
  if exists (select 1 from cafe_members where user_id = v_user and cafe_id <> p_cafe) then return _fail('other_cafe'); end if;
  if (select count(*) from cafe_members where cafe_id = p_cafe) >= 15 and not exists (select 1 from cafe_members where cafe_id = p_cafe and user_id = v_user) then return _fail('limit'); end if;
  insert into cafe_members (cafe_id, user_id, active, can_orders, can_payments, can_close, can_reports, can_kitchen, can_register, created_by)
    values (p_cafe, v_user, true, v_pos and coalesce(p_orders, false), v_pos and coalesce(p_payments, false), v_pos and coalesce(p_close, false), v_pos and coalesce(p_reports, false),
            v_pos and coalesce(p_kitchen, false), (not v_pos) and coalesce(p_register, false), auth.uid())
    on conflict (user_id) do update set active = true, can_orders = excluded.can_orders, can_payments = excluded.can_payments, can_close = excluded.can_close,
      can_reports = excluded.can_reports, can_kitchen = excluded.can_kitchen, can_register = excluded.can_register;
  perform _audit(p_cafe, 'pos', 'member.added', v_user::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function staff_update(p_member uuid, p_orders boolean, p_payments boolean, p_close boolean, p_reports boolean, p_kitchen boolean, p_register boolean, p_active boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare m cafe_members%rowtype; v_pos boolean;
begin
  select * into m from cafe_members where id = p_member;
  if m.id is null or not (owns_cafe(m.cafe_id) and exists (select 1 from cafes where id = m.cafe_id and not suspended)) then raise exception 'not allowed' using errcode = '42501'; end if;
  select (plan_tier = 'pos') into v_pos from cafes where id = m.cafe_id;
  update cafe_members set can_orders = v_pos and coalesce(p_orders, can_orders), can_payments = v_pos and coalesce(p_payments, can_payments), can_close = v_pos and coalesce(p_close, can_close),
    can_reports = v_pos and coalesce(p_reports, can_reports), can_kitchen = v_pos and coalesce(p_kitchen, can_kitchen), can_register = (not v_pos) and coalesce(p_register, can_register),
    active = coalesce(p_active, active) where id = m.id;
  perform _audit(m.cafe_id, 'pos', 'member.updated', m.user_id::text, jsonb_build_object('active', coalesce(p_active, m.active)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function staff_list(p_cafe uuid) returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not owns_cafe(p_cafe) then raise exception 'not allowed' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'email', u.email, 'active', m.active, 'orders', m.can_orders, 'payments', m.can_payments, 'close', m.can_close,
      'reports', m.can_reports, 'kitchen', m.can_kitchen, 'register', m.can_register) order by m.created_at)
    from cafe_members m join auth.users u on u.id = m.user_id where m.cafe_id = p_cafe), '[]'::jsonb);
end $$;

-- 9) data retention: orders, payments, feedback and audit logs after 12 months; visit counters after 120 days.
--    The sales register is the café's own bookkeeping and is NOT deleted. Run by the backup job (see docs/BACKUPS_AND_HOSTING.md).
create or replace function purge_old_data() returns jsonb language plpgsql security definer set search_path = public as $$
declare a int; b int; c int; d int;
begin
  delete from table_sessions where status = 'closed' and closed_at < now() - interval '12 months'; get diagnostics a = row_count;
  delete from feedback where created_at < now() - interval '12 months'; get diagnostics b = row_count;
  delete from security_audit_events where at < now() - interval '12 months'; get diagnostics c = row_count;
  delete from page_events where created_at < now() - interval '120 days'; get diagnostics d = row_count;
  return jsonb_build_object('sessions', a, 'feedback', b, 'audit', c, 'events', d);
end $$;

-- 10) who may call what
revoke all on function purge_old_data() from public, anon, authenticated;
revoke all on function register_save(uuid, date, bigint, bigint, text), staff_add(uuid, text, boolean, boolean, boolean, boolean, boolean, boolean),
  staff_update(uuid, boolean, boolean, boolean, boolean, boolean, boolean, boolean), staff_list(uuid) from public, anon, authenticated;
grant execute on function register_save(uuid, date, bigint, bigint, text), staff_add(uuid, text, boolean, boolean, boolean, boolean, boolean, boolean),
  staff_update(uuid, boolean, boolean, boolean, boolean, boolean, boolean, boolean), staff_list(uuid) to authenticated;

-- CHECK: must return ZERO rows
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
