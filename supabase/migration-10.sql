-- ============================================================================
-- migration-10: Security, PWA, Tax Settings & Digital Bill System
-- 1) Revoke order capabilities when closing a table session (prevents ghost session re-opening)
-- 2) Atomic admin unlink owner procedure (clears owner_email in cafe_admin to prevent auto-claim)
-- 3) Add staff_remove procedure (frees former staff user_id to be hired elsewhere)
-- 4) Time-lock historical sales register edits (staff restricted to today/yesterday; owners can edit up to 400 days)
-- 5) Tighten page events throttle ceiling to prevent storage bloat
-- 6) Bill & Tax settings in cafe_pos_settings (tax_enabled, tax_name, tax_percent, business_reg_no, receipt_note)
-- 7) Enhanced pos_order_status returning live payment status, payment method, bill details & digital receipt items
-- ============================================================================

-- 1) Revoke order capabilities when closing a table session
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
  update order_capabilities set revoked = true where table_id = s.table_id and not revoked;
  perform _audit(b.cafe_id, 'pos', 'session.closed', s.id::text, jsonb_build_object('total_minor', b.total_minor));
  return jsonb_build_object('ok', true);
end $$;

-- 2) Atomic admin unlink owner procedure
create or replace function admin_unlink_owner(p_cafe uuid) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update cafes set owner_id = null where id = p_cafe;
  update cafe_admin set owner_email = null where cafe_id = p_cafe;
  perform _audit(p_cafe, 'platform', 'owner.unlinked', null, '{}');
  return jsonb_build_object('ok', true);
end $$;
revoke all on function admin_unlink_owner(uuid) from public, anon;
grant execute on function admin_unlink_owner(uuid) to authenticated;

-- 3) Staff remove procedure (deletes member row so account is unlocked for re-hiring)
create or replace function staff_remove(p_cafe uuid, p_member uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare m cafe_members%rowtype;
begin
  select * into m from cafe_members where id = p_member and cafe_id = p_cafe;
  if m.id is null or not (owns_cafe(p_cafe) and exists (select 1 from cafes where id = p_cafe and not suspended)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from cafe_members where id = m.id;
  perform _audit(p_cafe, 'pos', 'member.removed', m.user_id::text, '{}');
  return jsonb_build_object('ok', true);
end $$;
revoke all on function staff_remove(uuid, uuid) from public, anon;
grant execute on function staff_remove(uuid, uuid) to authenticated;

-- 4) Time-lock historical sales register edits
create or replace function register_save(p_cafe uuid, p_day date, p_cash bigint, p_upi bigint, p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Asia/Kolkata')::date; v_email text; v_note text := nullif(left(btrim(coalesce(p_note, '')), 140), '');
begin
  if not register_access(p_cafe) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_day is null or p_day > v_today or p_day < v_today - 400 then return _fail('invalid'); end if;
  if not owns_cafe(p_cafe) and p_day < v_today - 1 then
    return _fail('past_date_locked');
  end if;
  if p_cash is null or p_upi is null or p_cash < 0 or p_upi < 0 or p_cash > 100000000 or p_upi > 100000000 then return _fail('invalid'); end if;
  insert into sales_register (cafe_id, day, cash_minor, upi_minor, note, updated_by, updated_at) values (p_cafe, p_day, p_cash, p_upi, v_note, auth.uid(), now())
    on conflict (cafe_id, day) do update set cash_minor = excluded.cash_minor, upi_minor = excluded.upi_minor, note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
  select email into v_email from auth.users where id = auth.uid();
  insert into sales_register_log (cafe_id, day, cash_minor, upi_minor, note, actor, actor_email) values (p_cafe, p_day, p_cash, p_upi, v_note, auth.uid(), v_email);
  return jsonb_build_object('ok', true);
end $$;

-- 5) Tighten page events throttle ceiling
create or replace function throttle_events() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from page_events where cafe_id = new.cafe_id and created_at > now() - interval '1 minute') >= 180 then
    raise exception 'Too many requests.';
  end if;
  return new;
end $$;

-- 6) Bill & Tax settings in cafe_pos_settings
alter table cafe_pos_settings add column if not exists tax_enabled boolean not null default false;
alter table cafe_pos_settings add column if not exists tax_name text not null default 'Tax';
alter table cafe_pos_settings add column if not exists tax_percent numeric(5,2) not null default 5.00 check (tax_percent between 0 and 100);
alter table cafe_pos_settings add column if not exists business_reg_no text check (char_length(business_reg_no) <= 40);
alter table cafe_pos_settings add column if not exists receipt_note text check (char_length(receipt_note) <= 200);

create or replace function pos_save_settings(
  p_cafe uuid,
  p_dine_in boolean,
  p_accepting boolean,
  p_lat double precision,
  p_lng double precision,
  p_radius integer,
  p_tax_enabled boolean default false,
  p_tax_name text default 'Tax',
  p_tax_percent numeric default 5.0,
  p_reg_no text default null,
  p_receipt_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or (owns_cafe(p_cafe) and cafe_has_pos(p_cafe))) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from cafes where id = p_cafe and plan_tier = 'pos') then return _fail('plan'); end if;
  if p_radius is null or p_radius not between 20 and 1000 then return _fail('invalid'); end if;
  if (p_lat is not null and p_lat not between -90 and 90) or (p_lng is not null and p_lng not between -180 and 180) then return _fail('invalid'); end if;
  if coalesce(p_dine_in, false) and (p_lat is null or p_lng is null) then return _fail('location'); end if;
  if p_tax_percent is not null and (p_tax_percent < 0 or p_tax_percent > 100) then return _fail('invalid'); end if;

  insert into cafe_pos_settings (cafe_id, dine_in_enabled, accepting_orders, lat, lng, radius_m, tax_enabled, tax_name, tax_percent, business_reg_no, receipt_note, updated_at)
    values (
      p_cafe,
      coalesce(p_dine_in, false),
      coalesce(p_accepting, false),
      p_lat,
      p_lng,
      p_radius,
      coalesce(p_tax_enabled, false),
      nullif(btrim(coalesce(p_tax_name, 'Tax')), ''),
      coalesce(p_tax_percent, 5.0),
      nullif(btrim(coalesce(p_reg_no, '')), ''),
      nullif(btrim(coalesce(p_receipt_note, '')), ''),
      now()
    )
    on conflict (cafe_id) do update set
      dine_in_enabled = excluded.dine_in_enabled,
      accepting_orders = excluded.accepting_orders,
      lat = excluded.lat,
      lng = excluded.lng,
      radius_m = excluded.radius_m,
      tax_enabled = excluded.tax_enabled,
      tax_name = excluded.tax_name,
      tax_percent = excluded.tax_percent,
      business_reg_no = excluded.business_reg_no,
      receipt_note = excluded.receipt_note,
      updated_at = now();

  perform _audit(p_cafe, 'pos', 'settings.saved', null, jsonb_build_object('dine_in', coalesce(p_dine_in, false), 'tax_enabled', coalesce(p_tax_enabled, false)));
  return jsonb_build_object('ok', true);
end $$;

-- 7) Enhanced pos_order_status returning live payment status, payment method & digital bill data
create or replace function pos_order_status(p_cap text, p_ref text) returns jsonb language plpgsql security definer stable set search_path = public as $$
declare
  v_o orders%rowtype; v_b bills%rowtype; v_c cafes%rowtype; v_ps cafe_pos_settings%rowtype;
  v_t cafe_tables%rowtype; v_items jsonb; v_method text; v_paid_at timestamptz;
begin
  select o.* into v_o from orders o
  join order_capabilities c on c.id = o.capability_id
  where c.token_hash = encode(sha256(convert_to(coalesce(p_cap, ''), 'UTF8')), 'hex')
    and o.ref = upper(coalesce(p_ref, '')) and o.cafe_id = c.cafe_id limit 1;
  if v_o.id is null then return jsonb_build_object('status', null); end if;

  select * into v_b from bills where id = v_o.bill_id;
  select * into v_c from cafes where id = v_o.cafe_id;
  select * into v_ps from cafe_pos_settings where cafe_id = v_o.cafe_id;
  select t.* into v_t from cafe_tables t join table_sessions s on s.table_id = t.id where s.id = v_o.session_id;

  select method, recorded_at into v_method, v_paid_at from payment_events
  where bill_id = v_b.id and event_type = 'payment' order by recorded_at desc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name', oi.name_snapshot,
    'qty', oi.quantity,
    'price_minor', oi.unit_price_minor,
    'line_total_minor', oi.line_total_minor
  )), '[]'::jsonb) into v_items from order_items oi where oi.order_id = v_o.id;

  return jsonb_build_object(
    'ok', true,
    'status', v_o.status,
    'ref', v_o.ref,
    'created_at', v_o.created_at,
    'order_total_minor', v_o.total_minor,
    'table_name', coalesce(v_t.display_name, 'Table'),
    'bill_id', v_b.id,
    'bill_status', v_b.status,
    'bill_total_minor', v_b.total_minor,
    'paid_minor', v_b.paid_minor,
    'is_paid', (v_b.paid_minor >= v_b.total_minor and v_b.total_minor > 0),
    'payment_method', v_method,
    'paid_at', v_paid_at,
    'items', v_items,
    'tax_enabled', coalesce(v_ps.tax_enabled, false),
    'tax_name', coalesce(v_ps.tax_name, 'Tax'),
    'tax_percent', coalesce(v_ps.tax_percent, 5.0),
    'business_reg_no', v_ps.business_reg_no,
    'receipt_note', v_ps.receipt_note,
    'cafe_name', v_c.name,
    'cafe_address', v_c.settings->>'address',
    'cafe_phone', v_c.settings->>'phone'
  );
end $$;

grant execute on function pos_order_status(text, text) to anon, authenticated;
