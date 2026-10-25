-- Run ONCE in Supabase SQL Editor. Security hardening: spam limits, size limits, retention notes.

-- 1) Spam throttles. Anyone can post feedback and page counters, so cap how fast one café can receive them.
create index if not exists feedback_cafe_created on feedback (cafe_id, created_at);
create index if not exists events_cafe_created on page_events (cafe_id, created_at);

create or replace function throttle_feedback() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from feedback where cafe_id = new.cafe_id and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many submissions. Please try again later.';
  end if;
  return new;
end $$;
drop trigger if exists throttle_feedback on feedback;
create trigger throttle_feedback before insert on feedback for each row execute function throttle_feedback();

create or replace function throttle_events() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from page_events where cafe_id = new.cafe_id and created_at > now() - interval '1 minute') >= 600 then
    raise exception 'Too many requests.';
  end if;
  return new;
end $$;
drop trigger if exists throttle_events on page_events;
create trigger throttle_events before insert on page_events for each row execute function throttle_events();

-- 2) Size limits so nobody can stuff huge text into the database (NOT VALID = applies to new writes only).
alter table cafes add constraint cafes_len check (char_length(name) <= 80 and char_length(coalesce(tagline,'')) <= 140 and char_length(coalesce(about,'')) <= 600 and char_length(coalesce(hours,'')) <= 120 and octet_length(settings::text) <= 4000) not valid;
alter table menu_categories add constraint cats_len check (char_length(name) <= 60) not valid;
alter table menu_items add constraint items_len check (char_length(name) <= 80 and char_length(coalesce(description,'')) <= 300) not valid;
alter table cafe_tables add constraint tables_len check (char_length(display_name) <= 40) not valid;

-- 3) Optional: delete old counters after 120 days (enable the pg_cron extension first: Database > Extensions).
-- select cron.schedule('trim-events', '0 3 * * *', $$delete from page_events where created_at < now() - interval '120 days'$$);

-- 4) CHECK: this should return ZERO rows (every table must have row level security on).
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
