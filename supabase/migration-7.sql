-- Run ONCE in the Supabase SQL Editor (after migration-6). Lets the admin see whether an owner's login exists.
create or replace function admin_owner_login_status(p_cafe uuid) returns text language plpgsql security definer stable set search_path = public as $$
declare v_email text; v_owner uuid;
begin
  if not is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select owner_id into v_owner from cafes where id = p_cafe;
  select lower(owner_email) into v_email from cafe_admin where cafe_id = p_cafe;
  if v_owner is not null then return 'connected'; end if;
  if v_email is null or v_email = '' then return 'no_email'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email and email_confirmed_at is not null) then return 'login_ready'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then return 'unconfirmed'; end if;
  return 'no_login';
end $$;
revoke all on function admin_owner_login_status(uuid) from public, anon;
grant execute on function admin_owner_login_status(uuid) to authenticated;
