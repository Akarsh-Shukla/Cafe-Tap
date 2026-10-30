-- ============================================================================
-- migration-6: POS plan (dine-in ordering, running table bills, counter payments)
-- Run AFTER migration-5. Test it on a separate STAGING Supabase project first.
-- Design: customers and staff never write to these tables directly. Every write
-- goes through the SECURITY DEFINER functions below, which re-check plan, role,
-- table, prices and state on the server.  This is a first implementation: run
-- supabase/tests/pos_tests.sql and the manual checks in docs/POS_TEST_PLAN.md
-- before using it for a real café.
-- ============================================================================

-- composite keys so a row can never point at another café's row
alter table cafe_tables add constraint cafe_tables_id_cafe unique (id, cafe_id);

create table cafe_pos_settings (
  cafe_id uuid primary key references cafes(id) on delete cascade,
  dine_in_enabled boolean not null default false,
  accepting_orders boolean not null default false,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  radius_m int not null default 100 check (radius_m between 20 and 1000),
  updated_at timestamptz not null default now()
);

create table table_sessions (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  table_id uuid not null,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at timestamptz not null default now(), closed_at timestamptz,
  opened_by uuid, closed_by uuid,
  unique (id, cafe_id),
  foreign key (table_id, cafe_id) references cafe_tables(id, cafe_id) on delete restrict
);
-- at most ONE open session per table, enforced by the database itself
create unique index one_open_session_per_table on table_sessions (table_id) where status = 'open';
create index table_sessions_cafe_status on table_sessions (cafe_id, status);

create table bills (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null,
  session_id uuid not null unique,
  status text not null default 'open' check (status in ('open','closed')),
  total_minor bigint not null default 0 check (total_minor >= 0),
  paid_minor bigint not null default 0 check (paid_minor >= 0),
  created_at timestamptz not null default now(), closed_at timestamptz,
  check (paid_minor <= total_minor),
  unique (id, cafe_id),
  foreign key (session_id, cafe_id) references table_sessions(id, cafe_id) on delete cascade
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null, session_id uuid not null, bill_id uuid not null,
  ref text not null,
  status text not null default 'received' check (status in ('received','preparing','ready','completed','cancelled')),
  source text not null check (source in ('customer','staff')),
  idempotency_key text not null,
  capability_id uuid,
  note text check (char_length(note) <= 140),
  total_minor bigint not null check (total_minor >= 0),
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (cafe_id, idempotency_key), unique (cafe_id, ref), unique (id, cafe_id),
  foreign key (bill_id, cafe_id) references bills(id, cafe_id) on delete cascade,
  foreign key (session_id, cafe_id) references table_sessions(id, cafe_id) on delete cascade
);
create index orders_session on orders (session_id);
create index orders_cafe_created on orders (cafe_id, created_at);
create index orders_cap on orders (capability_id, created_at);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null, order_id uuid not null, menu_item_id uuid,
  name_snapshot text not null,
  unit_price_minor int not null check (unit_price_minor >= 0),
  quantity int not null check (quantity between 1 and 50),
  line_total_minor bigint not null check (line_total_minor >= 0),
  foreign key (order_id, cafe_id) references orders(id, cafe_id) on delete cascade
);
create index order_items_order on order_items (order_id);

create table payment_events (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null, bill_id uuid not null,
  amount_minor bigint not null check (amount_minor <> 0),
  method text not null check (method in ('cash','upi')),
  event_type text not null check (event_type in ('payment','correction')),
  corrects uuid references payment_events(id),
  actor uuid not null,
  note text check (char_length(note) <= 140),
  recorded_at timestamptz not null default now(),
  foreign key (bill_id, cafe_id) references bills(id, cafe_id) on delete cascade
);
create index payment_events_bill on payment_events (bill_id);
create or replace function forbid_update() returns trigger language plpgsql as $$ begin raise exception 'payment history is append-only'; end $$;
create trigger payments_append_only before update on payment_events for each row execute function forbid_update();

create table order_capabilities (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  table_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (table_id, cafe_id) references cafe_tables(id, cafe_id) on delete cascade
);
create index order_caps_table on order_capabilities (table_id, created_at);
create index order_caps_exp on order_capabilities (expires_at);

alter table cafe_pos_settings enable row level security;
alter table table_sessions enable row level security;
alter table bills enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payment_events enable row level security;
alter table order_capabilities enable row level security;   -- no policies at all: only the functions below can touch it

-- READ policies. The platform admin is deliberately NOT included: no routine access to orders, sales or payments.
create policy "members read pos settings" on cafe_pos_settings for select to authenticated
  using (is_admin() or (cafe_has_pos(cafe_id) and (owns_cafe(cafe_id) or exists (select 1 from cafe_members m where m.cafe_id = cafe_pos_settings.cafe_id and m.user_id = auth.uid() and m.active))));
create policy "pos read sessions" on table_sessions for select to authenticated using (staff_can(cafe_id, 'orders'));
create policy "pos read bills" on bills for select to authenticated using (staff_can(cafe_id, 'orders'));
create policy "pos read orders" on orders for select to authenticated using (staff_can(cafe_id, 'orders'));
create policy "pos read items" on order_items for select to authenticated using (staff_can(cafe_id, 'orders'));
create policy "pos read payments" on payment_events for select to authenticated using (staff_can(cafe_id, 'orders') or staff_can(cafe_id, 'payments'));
create policy "staff read tables" on cafe_tables for select to authenticated using (staff_can(cafe_id, 'orders'));
-- NO insert/update/delete policies on any POS table: writes are possible only through the functions below.

-- ---------------------------------------------------------------- helpers
create or replace function _fail(p_reason text) returns jsonb language sql immutable as $$ select jsonb_build_object('ok', false, 'reason', p_reason) $$;
create or replace function _distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision) returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(least(1, sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))) $$;
create or replace function _require(cid uuid, perm text) returns void language plpgsql security definer stable set search_path = public as $$
begin if not staff_can(cid, perm) then raise exception 'not allowed' using errcode = '42501'; end if; end $$;

-- ---------------------------------------------------------------- shared order creation (never callable from the browser)
create or replace function _pos_create_order(p_cafe uuid, p_table uuid, p_source text, p_idem text, p_items jsonb, p_note text, p_cap uuid, p_actor uuid, p_expected bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ex orders%rowtype; v_lines jsonb; v_total bigint; v_sess uuid; v_bill uuid; v_bstat text; v_sstat text;
  v_order uuid; v_ref text; v_try int := 0; v_loop int := 0; v_note text;
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
      insert into orders (cafe_id, session_id, bill_id, ref, source, idempotency_key, capability_id, note, total_minor, created_by)
        values (p_cafe, v_sess, v_bill, v_ref, p_source, p_idem, p_cap, v_note, v_total, p_actor) returning id into v_order;
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
  update bills set total_minor = total_minor + v_total where id = v_bill;
  if p_source = 'staff' then perform _audit(p_cafe, 'pos', 'order.counter_created', v_ref, jsonb_build_object('total_minor', v_total)); end if;
  return jsonb_build_object('ok', true, 'ref', v_ref, 'status', 'received', 'total_minor', v_total);
exception when data_exception then
  return _fail('invalid');
end $$;

-- ---------------------------------------------------------------- customer-facing (anonymous) functions
create or replace function pos_ordering_state(p_cafe uuid) returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object('enabled', coalesce((
    select s.dine_in_enabled and s.accepting_orders from cafes c join cafe_pos_settings s on s.cafe_id = c.id
    where c.id = p_cafe and c.published and c.plan_tier = 'pos' and not c.suspended), false)) $$;

-- Step 1: prove you are at the café. Coordinates are used for this decision only and are NOT stored.
create or replace function pos_start_session(p_cafe uuid, p_table text, p_lat double precision, p_lng double precision, p_accuracy double precision)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_c cafes%rowtype; v_s cafe_pos_settings%rowtype; v_t cafe_tables%rowtype;
  v_dist double precision; v_token text; v_exp timestamptz := now() + interval '45 minutes';
begin
  if p_cafe is null or p_table is null or char_length(p_table) > 64 then return _fail('unavailable'); end if;
  select * into v_c from cafes where id = p_cafe and published and plan_tier = 'pos' and not suspended;
  select * into v_s from cafe_pos_settings where cafe_id = p_cafe;
  select * into v_t from cafe_tables where cafe_id = p_cafe and token = p_table and is_active;
  if v_c.id is null or v_s.cafe_id is null or v_t.id is null or not v_s.dine_in_enabled or not v_s.accepting_orders or v_s.lat is null or v_s.lng is null then
    return _fail('unavailable');
  end if;
  delete from order_capabilities where expires_at < now() - interval '1 day';
  if (select count(*) from order_capabilities where table_id = v_t.id and created_at > now() - interval '10 minutes') >= 25
     or (select count(*) from order_capabilities where cafe_id = p_cafe and created_at > now() - interval '10 minutes') >= 200 then
    return _fail('rate');
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then return _fail('location'); end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 150 then return _fail('accuracy'); end if;
  v_dist := _distance_m(p_lat, p_lng, v_s.lat, v_s.lng);
  if v_dist > v_s.radius_m then
    if (select count(*) from security_audit_events where cafe_id = p_cafe and action = 'pos.proximity_denied' and at > now() - interval '1 hour') < 50 then
      insert into security_audit_events (cafe_id, actor, category, action, target, meta) values (p_cafe, null, 'pos', 'pos.proximity_denied', v_t.display_name, '{}');
    end if;
    return _fail('outside');
  end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');   -- 64 hex chars, only its hash is stored
  insert into order_capabilities (cafe_id, table_id, token_hash, expires_at)
    values (p_cafe, v_t.id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_exp);
  return jsonb_build_object('ok', true, 'capability', v_token, 'expires_at', v_exp, 'table', v_t.display_name);
end $$;

-- Step 2: place an order with that short-lived, table-scoped capability.
create or replace function pos_submit_order(p_cap text, p_idem text, p_items jsonb, p_note text, p_expected bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cap order_capabilities%rowtype; v_c cafes%rowtype; v_s cafe_pos_settings%rowtype; v_t cafe_tables%rowtype;
begin
  if p_cap is null or char_length(p_cap) <> 64 then return _fail('expired'); end if;
  select * into v_cap from order_capabilities
    where token_hash = encode(sha256(convert_to(p_cap, 'UTF8')), 'hex') and not revoked and expires_at > now();
  if v_cap.id is null then return _fail('expired'); end if;
  select * into v_c from cafes where id = v_cap.cafe_id and published and plan_tier = 'pos' and not suspended;
  select * into v_s from cafe_pos_settings where cafe_id = v_cap.cafe_id;
  select * into v_t from cafe_tables where id = v_cap.table_id and cafe_id = v_cap.cafe_id and is_active;
  if v_c.id is null or v_s.cafe_id is null or v_t.id is null or not v_s.dine_in_enabled or not v_s.accepting_orders then return _fail('unavailable'); end if;
  if (select count(*) from orders where capability_id = v_cap.id and created_at > now() - interval '10 minutes') >= 8
     or (select count(*) from orders o join order_capabilities c on c.id = o.capability_id where c.table_id = v_cap.table_id and o.created_at > now() - interval '1 hour') >= 60 then
    return _fail('rate');
  end if;
  return _pos_create_order(v_cap.cafe_id, v_cap.table_id, 'customer', p_idem, p_items, p_note, v_cap.id, null, p_expected);
end $$;

-- Safe status of one order, only for whoever holds the capability it was placed with.
create or replace function pos_order_status(p_cap text, p_ref text) returns jsonb language sql security definer stable set search_path = public as $$
  select coalesce((select jsonb_build_object('status', o.status) from orders o join order_capabilities c on c.id = o.capability_id
    where c.token_hash = encode(sha256(convert_to(coalesce(p_cap, ''), 'UTF8')), 'hex') and not c.revoked and o.ref = upper(coalesce(p_ref, '')) and o.cafe_id = c.cafe_id limit 1),
    jsonb_build_object('status', null)) $$;

-- ---------------------------------------------------------------- staff / owner functions (login required, permission re-checked every time)
create or replace function pos_set_order_status(p_order uuid, p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; b bills%rowtype; v_ok boolean;
begin
  select * into o from orders where id = p_order;
  if o.id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  perform _require(o.cafe_id, 'orders');
  select * into b from bills where id = o.bill_id for update;
  select * into o from orders where id = p_order for update;
  if b.status <> 'open' then return _fail('closed'); end if;
  v_ok := (o.status = 'received' and p_status in ('preparing', 'cancelled')) or (o.status = 'preparing' and p_status in ('ready', 'cancelled')) or (o.status = 'ready' and p_status in ('completed', 'cancelled'));
  if not v_ok then return _fail('transition'); end if;
  if p_status = 'cancelled' then
    if b.paid_minor > b.total_minor - o.total_minor then return _fail('paid_exceeds'); end if;
    update bills set total_minor = total_minor - o.total_minor where id = b.id;
  end if;
  update orders set status = p_status, updated_at = now() where id = o.id;
  perform _audit(o.cafe_id, 'pos', 'order.' || p_status, o.ref, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function pos_record_payment(p_bill uuid, p_amount bigint, p_method text, p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
declare b bills%rowtype;
begin
  select * into b from bills where id = p_bill;
  if b.id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  perform _require(b.cafe_id, 'payments');
  select * into b from bills where id = p_bill for update;
  if p_method is null or p_method not in ('cash', 'upi') then return _fail('invalid'); end if;
  if b.status <> 'open' then return _fail('closed'); end if;
  if p_amount is null or p_amount <= 0 or p_amount > b.total_minor - b.paid_minor then return _fail('amount'); end if;
  insert into payment_events (cafe_id, bill_id, amount_minor, method, event_type, actor, note)
    values (b.cafe_id, b.id, p_amount, p_method, 'payment', auth.uid(), nullif(left(btrim(coalesce(p_note, '')), 140), ''));
  update bills set paid_minor = paid_minor + p_amount where id = b.id;
  perform _audit(b.cafe_id, 'pos', 'payment.recorded', b.id::text, jsonb_build_object('method', p_method, 'amount_minor', p_amount));
  return jsonb_build_object('ok', true, 'balance_minor', b.total_minor - b.paid_minor - p_amount);
end $$;

-- A wrong payment is never edited or deleted: the owner adds an opposite correction entry with a reason.
create or replace function pos_correct_payment(p_event uuid, p_reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare e payment_events%rowtype; b bills%rowtype;
begin
  select * into e from payment_events where id = p_event;
  if e.id is null or not owns_cafe(e.cafe_id) or not cafe_has_pos(e.cafe_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then return _fail('invalid'); end if;
  select * into b from bills where id = e.bill_id for update;
  if b.status <> 'open' then return _fail('closed'); end if;
  if e.event_type <> 'payment' or exists (select 1 from payment_events where corrects = e.id) then return _fail('invalid'); end if;
  insert into payment_events (cafe_id, bill_id, amount_minor, method, event_type, corrects, actor, note)
    values (e.cafe_id, e.bill_id, -e.amount_minor, e.method, 'correction', e.id, auth.uid(), left(btrim(p_reason), 140));
  update bills set paid_minor = paid_minor - e.amount_minor where id = b.id;
  perform _audit(e.cafe_id, 'pos', 'payment.corrected', e.id::text, jsonb_build_object('amount_minor', e.amount_minor));
  return jsonb_build_object('ok', true);
end $$;

create or replace function pos_close_session(p_session uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare b bills%rowtype; s table_sessions%rowtype;
begin
  select * into b from bills where session_id = p_session;
  if b.id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  perform _require(b.cafe_id, 'close');
  select * into b from bills where id = b.id for update;
  select * into s from table_sessions where id = p_session for update;
  if s.status <> 'open' or b.status <> 'open' then return _fail('closed'); end if;
  if exists (select 1 from orders where session_id = s.id and status in ('received', 'preparing', 'ready')) then return _fail('open_orders'); end if;
  if b.total_minor <> b.paid_minor then return jsonb_build_object('ok', false, 'reason', 'unpaid', 'balance_minor', b.total_minor - b.paid_minor); end if;
  update table_sessions set status = 'closed', closed_at = now(), closed_by = auth.uid() where id = s.id;
  update bills set status = 'closed', closed_at = now() where id = b.id;
  perform _audit(b.cafe_id, 'pos', 'session.closed', s.id::text, jsonb_build_object('total_minor', b.total_minor));
  return jsonb_build_object('ok', true);
end $$;

create or replace function pos_staff_add_order(p_cafe uuid, p_table uuid, p_idem text, p_items jsonb, p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform _require(p_cafe, 'orders');
  if not exists (select 1 from cafe_tables where id = p_table and cafe_id = p_cafe and is_active) then return _fail('invalid'); end if;
  return _pos_create_order(p_cafe, p_table, 'staff', p_idem, p_items, p_note, null, auth.uid(), null);
end $$;

create or replace function pos_save_settings(p_cafe uuid, p_dine_in boolean, p_accepting boolean, p_lat double precision, p_lng double precision, p_radius integer) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or (owns_cafe(p_cafe) and cafe_has_pos(p_cafe))) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from cafes where id = p_cafe and plan_tier = 'pos') then return _fail('plan'); end if;
  if p_radius is null or p_radius not between 20 and 1000 then return _fail('invalid'); end if;
  if (p_lat is not null and p_lat not between -90 and 90) or (p_lng is not null and p_lng not between -180 and 180) then return _fail('invalid'); end if;
  if coalesce(p_dine_in, false) and (p_lat is null or p_lng is null) then return _fail('location'); end if;
  insert into cafe_pos_settings (cafe_id, dine_in_enabled, accepting_orders, lat, lng, radius_m, updated_at)
    values (p_cafe, coalesce(p_dine_in, false), coalesce(p_accepting, false), p_lat, p_lng, p_radius, now())
    on conflict (cafe_id) do update set dine_in_enabled = excluded.dine_in_enabled, accepting_orders = excluded.accepting_orders, lat = excluded.lat, lng = excluded.lng, radius_m = excluded.radius_m, updated_at = now();
  perform _audit(p_cafe, 'pos', 'settings.saved', null, jsonb_build_object('dine_in', coalesce(p_dine_in, false), 'accepting', coalesce(p_accepting, false), 'radius_m', p_radius));
  return jsonb_build_object('ok', true);
end $$;

-- Staff: the platform operator creates the login (Supabase Auth > Users); the owner then grants permissions here.
create or replace function pos_add_staff(p_cafe uuid, p_email text, p_orders boolean, p_payments boolean, p_close boolean, p_reports boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if not (owns_cafe(p_cafe) and cafe_has_pos(p_cafe)) then raise exception 'not allowed' using errcode = '42501'; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) and email_confirmed_at is not null;
  if v_user is null then return _fail('no_account'); end if;
  if v_user = (select owner_id from cafes where id = p_cafe) or exists (select 1 from admins where user_id = v_user) then return _fail('invalid'); end if;
  if exists (select 1 from cafe_members where user_id = v_user and cafe_id <> p_cafe) then return _fail('other_cafe'); end if;
  if (select count(*) from cafe_members where cafe_id = p_cafe) >= 15 and not exists (select 1 from cafe_members where cafe_id = p_cafe and user_id = v_user) then return _fail('limit'); end if;
  insert into cafe_members (cafe_id, user_id, active, can_orders, can_payments, can_close, can_reports, created_by)
    values (p_cafe, v_user, true, coalesce(p_orders, true), coalesce(p_payments, false), coalesce(p_close, false), coalesce(p_reports, false), auth.uid())
    on conflict (user_id) do update set active = true, can_orders = excluded.can_orders, can_payments = excluded.can_payments, can_close = excluded.can_close, can_reports = excluded.can_reports;
  perform _audit(p_cafe, 'pos', 'member.added', v_user::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function pos_update_staff(p_member uuid, p_orders boolean, p_payments boolean, p_close boolean, p_reports boolean, p_active boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare m cafe_members%rowtype;
begin
  select * into m from cafe_members where id = p_member;
  if m.id is null or not (owns_cafe(m.cafe_id) and cafe_has_pos(m.cafe_id)) then raise exception 'not allowed' using errcode = '42501'; end if;
  update cafe_members set can_orders = coalesce(p_orders, can_orders), can_payments = coalesce(p_payments, can_payments), can_close = coalesce(p_close, can_close),
    can_reports = coalesce(p_reports, can_reports), active = coalesce(p_active, active) where id = m.id;
  perform _audit(m.cafe_id, 'pos', 'member.updated', m.user_id::text, jsonb_build_object('active', coalesce(p_active, m.active)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function pos_list_staff(p_cafe uuid) returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not owns_cafe(p_cafe) then raise exception 'not allowed' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'email', u.email, 'active', m.active, 'orders', m.can_orders, 'payments', m.can_payments, 'close', m.can_close, 'reports', m.can_reports) order by m.created_at)
    from cafe_members m join auth.users u on u.id = m.user_id where m.cafe_id = p_cafe), '[]'::jsonb);
end $$;

create or replace function pos_sales_summary(p_cafe uuid, p_from date, p_to date) returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  perform _require(p_cafe, 'reports');
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 92 then return _fail('range'); end if;
  return jsonb_build_object('ok', true,
    'orders', (select count(*) from orders o where o.cafe_id = p_cafe and o.status <> 'cancelled' and (o.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
    'billed_minor', (select coalesce(sum(o.total_minor), 0) from orders o where o.cafe_id = p_cafe and o.status <> 'cancelled' and (o.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
    'cash_minor', (select coalesce(sum(amount_minor), 0) from payment_events where cafe_id = p_cafe and method = 'cash' and (recorded_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
    'upi_minor', (select coalesce(sum(amount_minor), 0) from payment_events where cafe_id = p_cafe and method = 'upi' and (recorded_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
    'top_items', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select i.name_snapshot as name, sum(i.quantity)::int as qty from order_items i join orders o on o.id = i.order_id
        where i.cafe_id = p_cafe and o.status <> 'cancelled' and (o.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
        group by 1 order by 2 desc limit 5) t));
end $$;

-- ---------------------------------------------------------------- who may call what
revoke all on function _fail(text), _distance_m(double precision, double precision, double precision, double precision), _require(uuid, text),
  _pos_create_order(uuid, uuid, text, text, jsonb, text, uuid, uuid, bigint) from public, anon, authenticated;
revoke all on function pos_ordering_state(uuid), pos_start_session(uuid, text, double precision, double precision, double precision),
  pos_submit_order(text, text, jsonb, text, bigint), pos_order_status(text, text),
  pos_set_order_status(uuid, text), pos_record_payment(uuid, bigint, text, text), pos_correct_payment(uuid, text), pos_close_session(uuid),
  pos_staff_add_order(uuid, uuid, text, jsonb, text), pos_save_settings(uuid, boolean, boolean, double precision, double precision, integer),
  pos_add_staff(uuid, text, boolean, boolean, boolean, boolean), pos_update_staff(uuid, boolean, boolean, boolean, boolean, boolean),
  pos_list_staff(uuid), pos_sales_summary(uuid, date, date) from public, anon, authenticated;
grant execute on function pos_ordering_state(uuid), pos_start_session(uuid, text, double precision, double precision, double precision),
  pos_submit_order(text, text, jsonb, text, bigint), pos_order_status(text, text) to anon, authenticated;
grant execute on function pos_set_order_status(uuid, text), pos_record_payment(uuid, bigint, text, text), pos_correct_payment(uuid, text), pos_close_session(uuid),
  pos_staff_add_order(uuid, uuid, text, jsonb, text), pos_save_settings(uuid, boolean, boolean, double precision, double precision, integer),
  pos_add_staff(uuid, text, boolean, boolean, boolean, boolean), pos_update_staff(uuid, boolean, boolean, boolean, boolean, boolean),
  pos_list_staff(uuid), pos_sales_summary(uuid, date, date) to authenticated;

-- CHECK: must return ZERO rows (every table has row level security on)
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
