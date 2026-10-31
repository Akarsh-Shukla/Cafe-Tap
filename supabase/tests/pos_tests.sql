-- ============================================================================
-- POS security tests. Run in the SQL Editor of a STAGING project, after migrations 5 and 6.
-- Everything runs inside one transaction that is ROLLED BACK at the end, so nothing is kept.
-- Each block prints "PASS" or stops with "FAIL ...". Not run by the author (no database was
-- available): if a fixture insert errors on your project, tell the developer which line.
-- ============================================================================
begin;
-- fixtures (as the database owner)
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at) values
 ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-00000000000a','authenticated','authenticated','owner-a@test.local',now(),now(),now()),
 ('00000000-0000-0000-0000-000000000000','b0000000-0000-0000-0000-00000000000b','authenticated','authenticated','owner-b@test.local',now(),now(),now()),
 ('00000000-0000-0000-0000-000000000000','c0000000-0000-0000-0000-00000000000c','authenticated','authenticated','owner-c@test.local',now(),now(),now()),
 ('00000000-0000-0000-0000-000000000000','d0000000-0000-0000-0000-00000000000d','authenticated','authenticated','admin@test.local',now(),now(),now()),
 ('00000000-0000-0000-0000-000000000000','e0000000-0000-0000-0000-00000000000e','authenticated','authenticated','staff@test.local',now(),now(),now());
insert into admins (user_id) values ('d0000000-0000-0000-0000-00000000000d');
insert into cafes (id, owner_id, slug, name, published, plan_tier) values
 ('a1000000-0000-0000-0000-0000000000a1','a0000000-0000-0000-0000-00000000000a','test-cafe-a','Test A',true,'pos'),
 ('b1000000-0000-0000-0000-0000000000b1','b0000000-0000-0000-0000-00000000000b','test-cafe-b','Test B',true,'pos'),
 ('c1000000-0000-0000-0000-0000000000c1','c0000000-0000-0000-0000-00000000000c','test-cafe-c','Test C',true,'basic');
insert into cafe_pos_settings (cafe_id, dine_in_enabled, accepting_orders, lat, lng, radius_m) values
 ('a1000000-0000-0000-0000-0000000000a1',true,true,26.4499,80.3319,100),('b1000000-0000-0000-0000-0000000000b1',true,true,26.4499,80.3319,100);
insert into cafe_tables (id, cafe_id, display_name, token) values
 ('a2000000-0000-0000-0000-0000000000a2','a1000000-0000-0000-0000-0000000000a1','T1','tokena00000001'),
 ('b2000000-0000-0000-0000-0000000000b2','b1000000-0000-0000-0000-0000000000b1','T1','tokenb00000001'),
 ('c2000000-0000-0000-0000-0000000000c2','c1000000-0000-0000-0000-0000000000c1','T1','tokenc00000001');
insert into menu_categories (id, cafe_id, name) values
 ('a3000000-0000-0000-0000-0000000000a3','a1000000-0000-0000-0000-0000000000a1','Coffee'),('b3000000-0000-0000-0000-0000000000b3','b1000000-0000-0000-0000-0000000000b1','Coffee');
insert into menu_items (id, cafe_id, category_id, name, price_paise) values
 ('a4000000-0000-0000-0000-0000000000a4','a1000000-0000-0000-0000-0000000000a1','a3000000-0000-0000-0000-0000000000a3','Latte',15000),
 ('a4000000-0000-0000-0000-0000000000a5','a1000000-0000-0000-0000-0000000000a1','a3000000-0000-0000-0000-0000000000a3','Tea',5000),
 ('b4000000-0000-0000-0000-0000000000b4','b1000000-0000-0000-0000-0000000000b1','b3000000-0000-0000-0000-0000000000b3','Latte',9900);
insert into cafe_members (cafe_id, user_id, can_orders, can_payments, can_close, can_reports) values
 ('a1000000-0000-0000-0000-0000000000a1','e0000000-0000-0000-0000-00000000000e',true,false,false,false);

-- T1  Anonymous customer: wrong place is refused, right place works, price is server-side, retries are safe
set local role anon;
do $$ declare r jsonb; cap text; o jsonb; o2 jsonb; n int;
begin
  r := pos_start_session('a1000000-0000-0000-0000-0000000000a1','tokena00000001', 28.6, 77.2, 20);   -- far away
  if (r->>'ok')::boolean or r->>'reason' <> 'outside' then raise exception 'FAIL T1a outside radius was not refused: %', r; end if;
  r := pos_start_session('a1000000-0000-0000-0000-0000000000a1','tokenb00000001', 26.4499, 80.3319, 20);   -- table of ANOTHER café
  if (r->>'ok')::boolean then raise exception 'FAIL T1b wrong table accepted'; end if;
  r := pos_start_session('c1000000-0000-0000-0000-0000000000c1','tokenc00000001', 26.4499, 80.3319, 20);   -- Basic café
  if (r->>'ok')::boolean then raise exception 'FAIL T1c Basic café issued an ordering capability'; end if;
  r := pos_start_session('a1000000-0000-0000-0000-0000000000a1','tokena00000001', 26.4499, 80.3319, 20);
  if not (r->>'ok')::boolean then raise exception 'FAIL T1d valid location refused: %', r; end if;
  cap := r->>'capability';
  o := pos_submit_order(cap, 'idem-key-0000000001', '[{"id":"a4000000-0000-0000-0000-0000000000a4","qty":2}]', 'less sugar', 99999);   -- wrong expected total
  if o->>'reason' <> 'price_changed' then raise exception 'FAIL T1e price mismatch not caught: %', o; end if;
  o := pos_submit_order(cap, 'idem-key-0000000001', '[{"id":"a4000000-0000-0000-0000-0000000000a4","qty":2}]', 'less sugar', 30000);
  if not (o->>'ok')::boolean or (o->>'total_minor')::bigint <> 30000 then raise exception 'FAIL T1f order not created correctly: %', o; end if;
  o2 := pos_submit_order(cap, 'idem-key-0000000001', '[{"id":"a4000000-0000-0000-0000-0000000000a4","qty":2}]', 'less sugar', 30000);
  if not (o2->>'duplicate')::boolean or o2->>'ref' <> o->>'ref' then raise exception 'FAIL T1g retry created a second order'; end if;
  o2 := pos_submit_order(cap, 'idem-key-0000000002', '[{"id":"b4000000-0000-0000-0000-0000000000b4","qty":1}]', null, null);   -- item of another café
  if (o2->>'ok')::boolean then raise exception 'FAIL T1h cross-café item accepted'; end if;
  o2 := pos_submit_order(cap, 'idem-key-0000000003', '[{"id":"a4000000-0000-0000-0000-0000000000a5","qty":1}]', null, null);
  if not (o2->>'ok')::boolean then raise exception 'FAIL T1i second order refused: %', o2; end if;
  o2 := pos_submit_order(repeat('0', 64), 'idem-key-0000000004', '[{"id":"a4000000-0000-0000-0000-0000000000a5","qty":1}]', null, null);
  if o2->>'reason' <> 'expired' then raise exception 'FAIL T1j forged capability accepted'; end if;
  raise notice 'PASS T1 customer flow';
end $$;
-- anonymous users cannot read or write POS tables directly
do $$ declare n int; begin
  select count(*) into n from orders; if n <> 0 then raise exception 'FAIL T2a anon can read orders'; end if;
  select count(*) into n from payment_events; if n <> 0 then raise exception 'FAIL T2b anon can read payments'; end if;
  begin insert into orders (cafe_id, session_id, bill_id, ref, source, idempotency_key, total_minor) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'X', 'customer', 'k', 1);
    raise exception 'FAIL T2c anon inserted an order'; exception when insufficient_privilege or others then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise notice 'PASS T2 anonymous cannot touch POS tables';
end $$;
reset role;

-- T3  Tenant isolation: owner B and the platform admin see none of café A's orders, bills or payments
select set_config('request.jwt.claims','{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}',true), set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-00000000000b',true);
set local role authenticated;
do $$ declare n int; r jsonb; bill uuid; begin
  select count(*) into n from orders; if n <> 0 then raise exception 'FAIL T3a owner B reads café A orders (%)', n; end if;
  select count(*) into n from bills; if n <> 0 then raise exception 'FAIL T3b owner B reads café A bills'; end if;
  begin perform pos_record_payment(gen_random_uuid(), 100, 'cash', null); raise exception 'FAIL T3c random bill accepted'; exception when sqlstate '42501' then null; end;
  raise notice 'PASS T3 owner B isolated';
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"d0000000-0000-0000-0000-00000000000d","role":"authenticated"}',true), set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-00000000000d',true);
set local role authenticated;
do $$ declare n int; begin
  select count(*) into n from orders; if n <> 0 then raise exception 'FAIL T4a platform admin can read orders'; end if;
  select count(*) into n from order_items; if n <> 0 then raise exception 'FAIL T4b platform admin can read order items'; end if;
  select count(*) into n from bills; if n <> 0 then raise exception 'FAIL T4c platform admin can read bills'; end if;
  select count(*) into n from payment_events; if n <> 0 then raise exception 'FAIL T4d platform admin can read payments'; end if;
  select count(*) into n from feedback; if n <> 0 then raise exception 'FAIL T4e platform admin can read feedback'; end if;
  raise notice 'PASS T4 platform admin has no routine access to private data';
end $$;
reset role;

-- T5  Staff permissions: staff A can see and progress orders but cannot record payment or close
select set_config('request.jwt.claims','{"sub":"e0000000-0000-0000-0000-00000000000e","role":"authenticated"}',true), set_config('request.jwt.claim.sub','e0000000-0000-0000-0000-00000000000e',true);
set local role authenticated;
do $$ declare n int; b uuid; s uuid; r jsonb; o uuid; begin
  select count(*) into n from orders; if n <> 2 then raise exception 'FAIL T5a staff should see 2 orders, sees %', n; end if;
  select id, session_id into b, s from bills limit 1;
  begin perform pos_record_payment(b, 100, 'cash', null); raise exception 'FAIL T5b staff without permission recorded a payment'; exception when sqlstate '42501' then null; end;
  begin perform pos_close_session(s); raise exception 'FAIL T5c staff without permission closed the table'; exception when sqlstate '42501' then null; end;
  select id into o from orders order by created_at limit 1;
  r := pos_set_order_status(o, 'completed'); if (r->>'ok')::boolean then raise exception 'FAIL T5d skipped a status step'; end if;
  r := pos_set_order_status(o, 'preparing'); if not (r->>'ok')::boolean then raise exception 'FAIL T5e valid status change refused: %', r; end if;
  raise notice 'PASS T5 staff limits';
end $$;
reset role;

-- T6  Owner A: payments, over-payment, unpaid close, correction, close, and a fresh session afterwards
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}',true), set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-00000000000a',true);
set local role authenticated;
do $$ declare b uuid; s uuid; r jsonb; o record; ev uuid; tot bigint; begin
  select id, session_id, total_minor into b, s, tot from bills limit 1;
  if tot <> 35000 then raise exception 'FAIL T6a running bill should be 35000, is %', tot; end if;
  r := pos_close_session(s); if r->>'reason' not in ('unpaid','open_orders') then raise exception 'FAIL T6b closed with open orders or balance: %', r; end if;
  r := pos_record_payment(b, 40000, 'cash', null); if r->>'reason' <> 'amount' then raise exception 'FAIL T6c over-payment accepted'; end if;
  r := pos_record_payment(b, 10000, 'upi', 'confirmed in app'); if not (r->>'ok')::boolean then raise exception 'FAIL T6d payment refused: %', r; end if;
  select id into ev from payment_events where bill_id = b limit 1;
  r := pos_correct_payment(ev, 'typed the wrong amount'); if not (r->>'ok')::boolean then raise exception 'FAIL T6e correction refused: %', r; end if;
  -- With row level security and no UPDATE policy, an edit is silently ignored (0 rows). So check that nothing changed.
  begin update payment_events set amount_minor = 1; exception when others then null; end;
  if exists (select 1 from payment_events where amount_minor = 1) then raise exception 'FAIL T6f payment history was editable'; end if;
  r := pos_record_payment(b, 35000, 'cash', null); if not (r->>'ok')::boolean then raise exception 'FAIL T6g full payment refused: %', r; end if;
  for o in select id, status from orders where session_id = s loop
    if o.status = 'received' then perform pos_set_order_status(o.id, 'preparing'); end if;
  end loop;
  for o in select id from orders where session_id = s loop
    perform pos_set_order_status(o.id, 'ready'); perform pos_set_order_status(o.id, 'completed');
  end loop;
  r := pos_close_session(s); if not (r->>'ok')::boolean then raise exception 'FAIL T6h settled table could not be closed: %', r; end if;
  r := pos_staff_add_order('a1000000-0000-0000-0000-0000000000a1','a2000000-0000-0000-0000-0000000000a2','idem-key-0000000009','[{"id":"a4000000-0000-0000-0000-0000000000a5","qty":1}]',null);
  if not (r->>'ok')::boolean then raise exception 'FAIL T6i counter order refused: %', r; end if;
  if (select count(*) from table_sessions where table_id = 'a2000000-0000-0000-0000-0000000000a2' and status = 'open') <> 1 then raise exception 'FAIL T6j expected exactly one open session'; end if;
  if (select total_minor from bills b2 join table_sessions t on t.id = b2.session_id where t.table_id = 'a2000000-0000-0000-0000-0000000000a2' and t.status = 'open') <> 5000 then raise exception 'FAIL T6k new session inherited old items'; end if;
  raise notice 'PASS T6 payments, closing and fresh session';
end $$;
reset role;

-- T6l  The database itself (not only the policies) refuses to edit payment history, even for the table owner
do $$ begin
  begin update payment_events set amount_minor = 1; raise exception 'FAIL T6l trigger allowed an edit';
  exception when others then if sqlerrm not like '%append-only%' then raise exception 'FAIL T6l unexpected: %', sqlerrm; end if; end;
  raise notice 'PASS T6l payment history is append-only';
end $$;

-- T7  Plan enforcement and platform fields: a Basic café cannot use POS functions; owners cannot upgrade themselves
select set_config('request.jwt.claims','{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}',true), set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000c',true);
set local role authenticated;
do $$ declare r jsonb; begin
  begin r := pos_save_settings('c1000000-0000-0000-0000-0000000000c1', true, true, 26.4, 80.3, 100); if (r->>'ok')::boolean then raise exception 'FAIL T7a Basic café configured POS'; end if; exception when sqlstate '42501' then null; end;
  update cafes set plan_tier = 'pos', suspended = false where id = 'c1000000-0000-0000-0000-0000000000c1';
  if (select plan_tier from cafes where id = 'c1000000-0000-0000-0000-0000000000c1') <> 'basic' then raise exception 'FAIL T7b owner upgraded their own plan'; end if;
  raise notice 'PASS T7 plan enforcement';
end $$;
reset role;

-- T8  Linking an invited owner: the right person gets the café, nobody else can take it, and they cannot change protected fields
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at) values
 ('00000000-0000-0000-0000-000000000000','f0000000-0000-0000-0000-00000000000f','authenticated','authenticated','new-owner@test.local',now(),now(),now());
insert into cafes (id, slug, name, published) values ('f1000000-0000-0000-0000-0000000000f1','test-cafe-f','Test F',true);
insert into cafe_admin (cafe_id, owner_email) values ('f1000000-0000-0000-0000-0000000000f1','New-Owner@Test.local');
select set_config('request.jwt.claims','{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}',true), set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-00000000000b',true);
set local role authenticated;
do $$ begin
  perform claim_cafe();
  if (select owner_id from cafes where id = 'f1000000-0000-0000-0000-0000000000f1') is not null then raise exception 'FAIL T8a a stranger claimed the café'; end if;
  raise notice 'PASS T8a stranger cannot claim';
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"f0000000-0000-0000-0000-00000000000f","role":"authenticated"}',true), set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-00000000000f',true);
set local role authenticated;
do $$ begin
  perform claim_cafe();
  if (select owner_id from cafes where id = 'f1000000-0000-0000-0000-0000000000f1') is distinct from 'f0000000-0000-0000-0000-00000000000f'::uuid then raise exception 'FAIL T8b the invited owner was not linked'; end if;
  update cafes set slug = 'hacked', plan_tier = 'pos', suspended = false where id = 'f1000000-0000-0000-0000-0000000000f1';
  if (select slug from cafes where id = 'f1000000-0000-0000-0000-0000000000f1') <> 'test-cafe-f' or (select plan_tier from cafes where id = 'f1000000-0000-0000-0000-0000000000f1') <> 'basic' then raise exception 'FAIL T8c owner changed a protected field'; end if;
  raise notice 'PASS T8 invited owner linked, protected fields locked';
end $$;
reset role;
rollback;   -- nothing above is kept
