-- ============================================================================
-- migration-10: Security, PWA, Combos, Add-ons, Offers Engine & Digital Bill System
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
alter table cafe_pos_settings add column if not exists tax_feature_enabled boolean not null default false;

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

  -- Security boundary: If admin has not enabled the tax feature for this cafe, reject enabling tax breakdown
  if coalesce(p_tax_enabled, false) and not is_admin() then
    if not coalesce((select tax_feature_enabled from cafe_pos_settings where cafe_id = p_cafe), false) then
      p_tax_enabled := false;
    end if;
  end if;

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

-- 7) Combos and Add-ons columns on menu_items
alter table menu_items add column if not exists is_combo boolean not null default false;
alter table menu_items add column if not exists add_ons jsonb not null default '[]'::jsonb;

-- 8) Rich Offers & Discount Rules
alter table offers add column if not exists kind text not null default 'flat' check (kind in ('flat', 'percent', 'bogo', 'combo'));
alter table offers add column if not exists discount_percent numeric(5,2) check (discount_percent between 0 and 100);
alter table offers add column if not exists discount_paise int check (discount_paise >= 0);
alter table offers add column if not exists min_order_paise int not null default 0 check (min_order_paise >= 0);

-- 9) Orders and Bills Discount & Offer columns
alter table orders add column if not exists offer_id uuid references offers(id) on delete set null;
alter table orders add column if not exists offer_title text;
alter table orders add column if not exists discount_minor bigint not null default 0 check (discount_minor >= 0);
alter table bills add column if not exists discount_minor bigint not null default 0 check (discount_minor >= 0);
alter table bills add column if not exists offer_title text;

-- 10) Upgraded _pos_create_order supporting Add-ons and Offers Engine
create or replace function _pos_create_order(
  p_cafe uuid,
  p_table uuid,
  p_source text,
  p_idem text,
  p_items jsonb,
  p_note text,
  p_cap uuid,
  p_actor uuid,
  p_expected bigint,
  p_offer uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ex orders%rowtype; v_sess uuid; v_bill uuid; v_bstat text; v_sstat text;
  v_order uuid; v_ref text; v_try int := 0; v_loop int := 0; v_note text;
  v_status text := case when p_source = 'customer' then 'pending' else 'received' end;
  v_total bigint := 0; v_discount bigint := 0; v_final_total bigint := 0;
  v_off offers%rowtype; v_off_title text := null;
  elem jsonb; v_item menu_items%rowtype; v_cat menu_categories%rowtype;
  v_qty int; v_line_name text; v_unit_price int; v_addon_price int;
  v_addon_name text; v_addon jsonb; v_cheapest int := 999999999;
  v_order_items jsonb := '[]'::jsonb;
begin
  if p_idem is null or p_idem !~ '^[A-Za-z0-9_-]{16,64}$' then return _fail('invalid'); end if;

  select * into v_ex from orders where cafe_id = p_cafe and idempotency_key = p_idem;
  if v_ex.id is not null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'ref', v_ex.ref, 'status', v_ex.status, 'total_minor', v_ex.total_minor);
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then return _fail('invalid'); end if;

  -- Validate each item and calculate prices securely
  for elem in select * from jsonb_array_elements(p_items) loop
    if elem->>'id' !~ '^[0-9a-fA-F-]{36}$' or coalesce(elem->>'qty', '') !~ '^[0-9]{1,2}$' then return _fail('invalid'); end if;
    v_qty := (elem->>'qty')::int;
    if v_qty not between 1 and 20 then return _fail('invalid'); end if;

    select * into v_item from menu_items where id = (elem->>'id')::uuid and cafe_id = p_cafe;
    select * into v_cat from menu_categories where id = v_item.category_id;
    if v_item.id is null or not v_item.is_available or not coalesce(v_cat.is_visible, false) then
      return jsonb_build_object('ok', false, 'reason', 'unavailable', 'names', jsonb_build_array(coalesce(v_item.name, 'Item')));
    end if;

    v_unit_price := v_item.price_paise;
    v_line_name := v_item.name;

    -- Add-ons verification from server-stored item add_ons definition
    if elem->'addons' is not null and jsonb_typeof(elem->'addons') = 'array' and jsonb_array_length(elem->'addons') > 0 then
      for v_addon in select * from jsonb_array_elements(elem->'addons') loop
        v_addon_name := btrim(v_addon#>>'{}');
        v_addon_price := coalesce((
          select (a->>'price_paise')::int from jsonb_array_elements(v_item.add_ons) a
          where lower(btrim(a->>'name')) = lower(v_addon_name) limit 1
        ), 0);
        v_unit_price := v_unit_price + v_addon_price;
      end loop;
      v_line_name := v_line_name || ' (+' || (
        select string_agg(btrim(a#>>'{}'), ', ') from jsonb_array_elements(elem->'addons') a
      ) || ')';
    end if;

    if v_unit_price < v_cheapest then v_cheapest := v_unit_price; end if;
    v_total := v_total + (v_unit_price::bigint * v_qty::bigint);

    v_order_items := v_order_items || jsonb_build_object(
      'menu_item_id', v_item.id,
      'name_snapshot', v_line_name,
      'unit_price_minor', v_unit_price,
      'quantity', v_qty,
      'line_total_minor', v_unit_price::bigint * v_qty::bigint
    );
  end loop;

  if v_total > 10000000 then return _fail('invalid'); end if;

  -- Offers calculation
  if p_offer is not null then
    select * into v_off from offers
    where id = p_offer and cafe_id = p_cafe and is_active and (valid_until is null or valid_until >= (now() at time zone 'Asia/Kolkata')::date);
    if v_off.id is not null and v_total >= v_off.min_order_paise then
      v_off_title := v_off.title;
      if v_off.kind = 'percent' and v_off.discount_percent is not null then
        v_discount := least(v_total, round(v_total * (v_off.discount_percent / 100.0)));
      elsif v_off.kind = 'flat' and v_off.discount_paise is not null then
        v_discount := least(v_total, v_off.discount_paise);
      elsif v_off.kind = 'bogo' then
        v_discount := least(v_total, v_cheapest);
      elsif v_off.kind = 'combo' then
        v_discount := least(v_total, coalesce(v_off.discount_paise, round(v_total * 0.15)));
      end if;
    end if;
  end if;

  v_final_total := greatest(0, v_total - v_discount);

  if p_expected is not null and abs(p_expected - v_final_total) > 50 then
    return jsonb_build_object('ok', false, 'reason', 'price_changed', 'total_minor', v_final_total);
  end if;

  v_note := nullif(left(btrim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]', ' ', 'g')), 140), '');

  -- Session and bill management
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
      insert into orders (cafe_id, session_id, bill_id, ref, status, source, idempotency_key, capability_id, note, total_minor, discount_minor, offer_id, offer_title, created_by)
        values (p_cafe, v_sess, v_bill, v_ref, v_status, p_source, p_idem, p_cap, v_note, v_final_total, v_discount, v_off.id, v_off_title, p_actor)
        returning id into v_order;
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
    select p_cafe, v_order, (oi->>'menu_item_id')::uuid, oi->>'name_snapshot', (oi->>'unit_price_minor')::int, (oi->>'quantity')::int, (oi->>'line_total_minor')::bigint
    from jsonb_array_elements(v_order_items) oi;

  if v_status = 'received' then
    update bills set
      total_minor = total_minor + v_final_total,
      discount_minor = discount_minor + v_discount,
      offer_title = coalesce(offer_title, v_off_title)
    where id = v_bill;
  end if;

  if p_source = 'staff' then
    perform _audit(p_cafe, 'pos', 'order.counter_created', v_ref, jsonb_build_object('total_minor', v_final_total, 'discount_minor', v_discount));
  end if;

  return jsonb_build_object('ok', true, 'ref', v_ref, 'status', v_status, 'total_minor', v_final_total, 'discount_minor', v_discount, 'offer_title', v_off_title);
exception when data_exception then
  return _fail('invalid');
end $$;

-- 11) Upgraded pos_submit_order with optional p_offer parameter
create or replace function pos_submit_order(
  p_cap text,
  p_idem text,
  p_items jsonb,
  p_note text,
  p_expected bigint default null,
  p_offer uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
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
  return _pos_create_order(v_cap.cafe_id, v_cap.table_id, 'customer', p_idem, p_items, p_note, v_cap.id, null, p_expected, p_offer);
end $$;

-- 12) Upgraded pos_staff_add_order with optional p_offer parameter
create or replace function pos_staff_add_order(
  p_cafe uuid,
  p_table uuid,
  p_idem text,
  p_items jsonb,
  p_note text,
  p_offer uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform _require(p_cafe, 'orders');
  if not exists (select 1 from cafe_tables where id = p_table and cafe_id = p_cafe and is_active) then return _fail('invalid'); end if;
  return _pos_create_order(p_cafe, p_table, 'staff', p_idem, p_items, p_note, null, auth.uid(), null, p_offer);
end $$;

-- 13) Enhanced pos_order_status returning live payment status, payment method & digital bill data
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
    'subtotal_minor', v_o.total_minor + coalesce(v_o.discount_minor, 0),
    'discount_minor', coalesce(v_o.discount_minor, 0),
    'offer_title', v_o.offer_title,
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

grant execute on function pos_submit_order(text, text, jsonb, text, bigint, uuid) to anon, authenticated;
grant execute on function pos_staff_add_order(uuid, uuid, text, jsonb, text, uuid) to authenticated;
grant execute on function pos_order_status(text, text) to anon, authenticated;

-- 14) Public read-only bill lookup by cafe slug and order reference
create or replace function get_public_bill(p_slug text, p_ref text) returns jsonb language plpgsql security definer stable set search_path = public as $$
declare
  v_c cafes%rowtype; v_o orders%rowtype; v_b bills%rowtype; v_ps cafe_pos_settings%rowtype;
  v_t cafe_tables%rowtype; v_items jsonb; v_method text; v_paid_at timestamptz;
begin
  select * into v_c from cafes where slug = lower(btrim(coalesce(p_slug, ''))) and published limit 1;
  if v_c.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;

  select * into v_o from orders where cafe_id = v_c.id and ref = upper(btrim(coalesce(p_ref, ''))) limit 1;
  if v_o.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;

  select * into v_b from bills where id = v_o.bill_id;
  select * into v_ps from cafe_pos_settings where cafe_id = v_c.id;
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
    'subtotal_minor', v_o.total_minor + coalesce(v_o.discount_minor, 0),
    'discount_minor', coalesce(v_o.discount_minor, 0),
    'offer_title', v_o.offer_title,
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

grant execute on function get_public_bill(text, text) to anon, authenticated;

-- 15) Admin procedure to enable or disable Tax & Invoicing for a cafe
create or replace function admin_set_tax_feature(p_cafe uuid, p_enabled boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into cafe_pos_settings (cafe_id, tax_feature_enabled, updated_at)
    values (p_cafe, coalesce(p_enabled, false), now())
    on conflict (cafe_id) do update set
      tax_feature_enabled = coalesce(p_enabled, false),
      tax_enabled = case when coalesce(p_enabled, false) then cafe_pos_settings.tax_enabled else false end,
      updated_at = now();
  perform _audit(p_cafe, 'admin', 'tax_feature.updated', null, jsonb_build_object('tax_feature_enabled', coalesce(p_enabled, false)));
  return jsonb_build_object('ok', true);
end $$;

grant execute on function admin_set_tax_feature(uuid, boolean) to authenticated;

-- 16) High-Scale Database Performance Indexes (optimised for 10+ active cafes with 10,000+ daily orders)
create index if not exists idx_orders_cafe_created on orders (cafe_id, created_at desc);
create index if not exists idx_orders_session on orders (session_id);
create index if not exists idx_orders_bill on orders (bill_id);
create index if not exists idx_orders_ref on orders (ref);
create index if not exists idx_order_items_order on order_items (order_id);
create index if not exists idx_order_capabilities_token on order_capabilities (token_hash) where not revoked;
create index if not exists idx_payment_events_bill on payment_events (bill_id, recorded_at desc);
create index if not exists idx_table_sessions_active on table_sessions (cafe_id, table_id) where status = 'open';
create index if not exists idx_menu_items_cafe_cat on menu_items (cafe_id, category_id, sort_order) where is_available;
create index if not exists idx_offers_active on offers (cafe_id, is_active) where is_active;
