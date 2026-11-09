-- Run this in the SQL Editor of ANY Supabase project to see which steps it already has.
-- "applied = true" means that step is done in THIS project. Compare the project ID in the dashboard address
-- (supabase.com/dashboard/project/<ID>/...) with the ID inside VITE_SUPABASE_URL in your .env.local.
select step, applied from (
  select 1 as n, 'schema.sql + migrations 2-4 (café tables)' as step, to_regclass('public.cafe_admin') is not null as applied
  union all select 2, 'migration-5 (plan_tier column)', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cafes' and column_name = 'plan_tier')
  union all select 3, 'migration-5 (owner email moved to cafe_admin)', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cafe_admin' and column_name = 'owner_email')
  union all select 4, 'migration-6 (POS tables)', to_regclass('public.payment_events') is not null
  union all select 5, 'migration-7 (owner login status)', exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'admin_owner_login_status')
  union all select 7, 'migration-9 (approval, kitchen, register)', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cafe_members' and column_name = 'can_kitchen')
  union all select 6, 'migration-8 (owner linking fix)', coalesce((select pg_get_functiondef(p.oid) like '%old.owner_id is null%' from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'lock_cafe_fields' limit 1), false)
  union all select 8, 'migration-10 (security & capability revoke)', exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'admin_unlink_owner')
) t order by n;
