-- ============================================================================
-- migration-5: security fixes from the audit + plans, suspension, staff membership
-- Run ONCE in the Supabase SQL Editor, then deploy the matching app version
-- straight away (the admin pages change slightly). Safe for the Basic plan.
-- ============================================================================

-- 1) Plan tier and suspension (only the platform admin can change these; owners cannot).
alter table cafes add column if not exists plan_tier text not null default 'basic' check (plan_tier in ('basic','pos'));
alter table cafes add column if not exists suspended boolean not null default false;

-- 2) New trigger/claim logic first (they no longer touch cafes.owner_email)
create or replace function lock_cafe_fields() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    new.slug := old.slug; new.owner_id := old.owner_id; new.plan_tier := old.plan_tier; new.suspended := old.suspended;
  end if;
  return new;
end $$;

-- 3) FIX: owner emails were readable by anyone through the public cafes row. Move them to the admin-only table.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cafes' and column_name = 'owner_email') then
    alter table cafe_admin add column if not exists owner_email text;
    insert into cafe_admin (cafe_id, owner_email) select id, lower(owner_email) from cafes where owner_email is not null
      on conflict (cafe_id) do update set owner_email = excluded.owner_email where cafe_admin.owner_email is null;
    alter table cafes drop column owner_email;
  end if;
end $$;
alter table cafe_admin add column if not exists owner_email text;

create or replace function claim_cafe() returns void language plpgsql security definer set search_path = public as $$
begin
  update cafes c set owner_id = auth.uid() from cafe_admin a
  where a.cafe_id = c.id and c.owner_id is null and a.owner_email is not null
    and lower(a.owner_email) = (select lower(email) from auth.users where id = auth.uid() and email_confirmed_at is not null);
end $$;

-- 4) Staff membership (staff are managed only through the pos_* functions in migration-6)
create table if not exists cafe_members (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  can_orders boolean not null default true,
  can_payments boolean not null default false,
  can_close boolean not null default false,
  can_reports boolean not null default false,
  created_by uuid, created_at timestamptz not null default now(),
  unique (user_id)
);
alter table cafe_members enable row level security;

-- 5) Authorisation helpers
create or replace function is_owner(cid uuid) returns boolean language sql security definer stable set search_path = public as $$
  select is_admin() or exists (select 1 from cafes where id = cid and owner_id = auth.uid() and not suspended) $$;
-- owner only (no platform admin): used for private data such as feedback and visit counts
create or replace function owns_cafe(cid uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from cafes where id = cid and owner_id = auth.uid()) $$;
create or replace function cafe_has_pos(cid uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from cafes where id = cid and plan_tier = 'pos' and not suspended) $$;
create or replace function staff_can(cid uuid, perm text) returns boolean language sql security definer stable set search_path = public as $$
  select cafe_has_pos(cid) and (owns_cafe(cid) or exists (
    select 1 from cafe_members m where m.cafe_id = cid and m.user_id = auth.uid() and m.active and
      case perm when 'orders' then m.can_orders when 'payments' then m.can_payments when 'close' then m.can_close when 'reports' then m.can_reports else false end)) $$;

-- 6) Policies
drop policy if exists "owner updates own cafe" on cafes;
create policy "owner updates own cafe" on cafes for update to authenticated
  using (owner_id = auth.uid() and not suspended) with check (owner_id = auth.uid() and not suspended);
drop policy if exists "member reads cafe" on cafes;
create policy "member reads cafe" on cafes for select to authenticated
  using (exists (select 1 from cafe_members m where m.cafe_id = cafes.id and m.user_id = auth.uid() and m.active));
drop policy if exists "owner reads members" on cafe_members;
create policy "owner reads members" on cafe_members for select to authenticated using (owns_cafe(cafe_id));
drop policy if exists "member reads own row" on cafe_members;
create policy "member reads own row" on cafe_members for select to authenticated using (user_id = auth.uid());

-- FIX: platform admin must not read private feedback or visit counts
drop policy if exists "owner reads feedback" on feedback;
drop policy if exists "owner deletes feedback" on feedback;
create policy "owner reads feedback" on feedback for select to authenticated using (owns_cafe(cafe_id));
create policy "owner deletes feedback" on feedback for delete to authenticated using (owns_cafe(cafe_id));
drop policy if exists "owner reads events" on page_events;
create policy "owner reads events" on page_events for select to authenticated using (owns_cafe(cafe_id));

-- 7) Audit trail (append-only: no insert/update/delete policies, written by trusted functions only)
create table if not exists security_audit_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  cafe_id uuid references cafes(id) on delete set null,
  actor uuid,
  category text not null check (category in ('platform','pos')),
  action text not null,
  target text,
  meta jsonb not null default '{}'
);
create index if not exists audit_cafe_at on security_audit_events (cafe_id, at);
alter table security_audit_events enable row level security;
drop policy if exists "owner reads pos audit" on security_audit_events;
create policy "owner reads pos audit" on security_audit_events for select to authenticated using (cafe_id is not null and category = 'pos' and owns_cafe(cafe_id));
drop policy if exists "admin reads platform audit" on security_audit_events;
create policy "admin reads platform audit" on security_audit_events for select to authenticated using (category = 'platform' and is_admin());

create or replace function _audit(p_cafe uuid, p_cat text, p_action text, p_target text, p_meta jsonb) returns void language sql security definer set search_path = public as $$
  insert into security_audit_events (cafe_id, actor, category, action, target, meta) values (p_cafe, auth.uid(), p_cat, p_action, left(p_target, 80), coalesce(p_meta, '{}'::jsonb)) $$;
revoke all on function _audit(uuid, text, text, text, jsonb) from public, anon, authenticated;

create or replace function audit_cafe_changes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plan_tier is distinct from old.plan_tier then perform _audit(new.id, 'platform', 'plan.changed', null, jsonb_build_object('from', old.plan_tier, 'to', new.plan_tier)); end if;
  if new.suspended is distinct from old.suspended then perform _audit(new.id, 'platform', case when new.suspended then 'cafe.suspended' else 'cafe.reinstated' end, null, '{}'); end if;
  if new.owner_id is distinct from old.owner_id then perform _audit(new.id, 'platform', 'owner.changed', null, '{}'); end if;
  return null;
end $$;
drop trigger if exists audit_cafe_changes on cafes;
create trigger audit_cafe_changes after update on cafes for each row execute function audit_cafe_changes();

-- 8) FIX: table codes were listable by anyone. Customers now only get a table's NAME for a code they already hold.
drop policy if exists "public tables" on cafe_tables;
create or replace function table_label(p_cafe uuid, p_token text) returns text language sql security definer stable set search_path = public as $$
  select t.display_name from cafe_tables t join cafes c on c.id = t.cafe_id where t.cafe_id = p_cafe and t.token = p_token and t.is_active and c.published limit 1 $$;
grant execute on function table_label(uuid, text) to anon, authenticated;

-- 9) FIX: uploads are limited to café owners/admin, 2 MB, image types only (enforced by the server, not the browser)
drop policy if exists "owner uploads" on storage.objects;
create policy "owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'cafe-images' and (storage.foldername(name))[1] = auth.uid()::text
    and (is_admin() or exists (select 1 from public.cafes where owner_id = auth.uid() and not suspended)));
update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'cafe-images';

-- CHECK: both queries should return zero rows.
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
select column_name from information_schema.columns where table_name = 'cafes' and column_name = 'owner_email';
