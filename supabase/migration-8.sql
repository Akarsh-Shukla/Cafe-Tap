-- ============================================================================
-- migration-8: FIX owner linking. Run ONCE in the Supabase project your site uses.
-- Bug: the "lock" trigger reset owner_id for everyone except the admin, so when an invited owner
-- logged in, claim_cafe() tried to link their café but the trigger silently undid it.
-- Now the ONE allowed change is "an unowned café becomes owned by the person claiming it".
-- Normal users still cannot reach that case: the row-level rule only lets them update cafés they already own.
-- ============================================================================
create or replace function lock_cafe_fields() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    new.slug := old.slug; new.plan_tier := old.plan_tier; new.suspended := old.suspended;
    if not (old.owner_id is null and new.owner_id is not distinct from auth.uid()) then new.owner_id := old.owner_id; end if;
  end if;
  return new;
end $$;

-- Optional check: shows, for each café, whether the owner email is saved and whether a confirmed login exists.
select c.slug, c.owner_id, a.owner_email, u.id as login_id, u.email_confirmed_at
from cafes c left join cafe_admin a on a.cafe_id = c.id
left join auth.users u on lower(u.email) = lower(a.owner_email);
