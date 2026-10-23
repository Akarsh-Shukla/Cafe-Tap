-- Run ONCE in Supabase SQL Editor (after schema.sql). Adds admin + client management.
create table admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table admins enable row level security;
create function is_admin() returns boolean language sql security definer stable set search_path = public as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;
create policy "read own admin row" on admins for select to authenticated using (user_id = auth.uid());

-- admins can manage every café's data (menu, offers, tables, feedback all use is_owner)
create or replace function is_owner(cid uuid) returns boolean language sql security definer stable set search_path = public as $$ select is_admin() or exists (select 1 from cafes where id = cid and owner_id = auth.uid()) $$;

-- cafés are created by you; the owner is linked by email when they sign up
alter table cafes alter column owner_id drop not null;
alter table cafes add column owner_email text;
alter table cafes drop constraint cafes_owner_id_fkey;
alter table cafes add constraint cafes_owner_id_fkey foreign key (owner_id) references auth.users(id) on delete set null;
drop policy "owner manages cafe" on cafes;
create policy "owner reads own cafe" on cafes for select to authenticated using (owner_id = auth.uid());
create policy "owner updates own cafe" on cafes for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "admin manages cafes" on cafes for all to authenticated using (is_admin()) with check (is_admin());

-- owners cannot change the web address or who owns the café
create function lock_cafe_fields() returns trigger language plpgsql security definer set search_path = public as $$
begin if not is_admin() then new.slug := old.slug; new.owner_id := old.owner_id; new.owner_email := old.owner_email; end if; return new; end $$;
create trigger lock_cafe_fields before update on cafes for each row execute function lock_cafe_fields();

-- links a café to the owner who signs up with the matching, CONFIRMED email
create function claim_cafe() returns void language plpgsql security definer set search_path = public as $$
begin
  update cafes set owner_id = auth.uid() where owner_id is null
    and lower(owner_email) = (select lower(email) from auth.users where id = auth.uid() and email_confirmed_at is not null);
end $$;

-- private business notes: only you can read this (cafes rows are public, so this must be a separate table)
create table cafe_admin (cafe_id uuid primary key references cafes(id) on delete cascade, plan text not null default 'trial' check (plan in ('trial','active','paused','ended')), trial_end date, monthly_price_inr int, notes text);
alter table cafe_admin enable row level security;
create policy "admin only" on cafe_admin for all to authenticated using (is_admin()) with check (is_admin());

-- FINAL STEP: make yourself the admin (replace with the email you signed up with)
-- insert into admins (user_id) select id from auth.users where email = 'YOUR_EMAIL_HERE';
