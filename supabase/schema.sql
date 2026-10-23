-- Supabase > SQL Editor > New query > paste all > Run
create table cafes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$' and slug not in ('admin','login','api','dashboard','t')),
  name text not null, tagline text, about text, hours text,
  theme text not null default 'roastery' check (theme in ('roastery','bakery','chai')),
  logo_url text, cover_url text,
  settings jsonb not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table menu_categories (id uuid primary key default gen_random_uuid(), cafe_id uuid not null references cafes(id) on delete cascade, name text not null, sort_order int not null default 0, is_visible boolean not null default true);
create table menu_items (id uuid primary key default gen_random_uuid(), cafe_id uuid not null references cafes(id) on delete cascade, category_id uuid not null references menu_categories(id) on delete cascade, name text not null, description text, price_paise int not null default 0 check (price_paise >= 0), image_url text, is_available boolean not null default true, sort_order int not null default 0);
create table cafe_tables (id uuid primary key default gen_random_uuid(), cafe_id uuid not null references cafes(id) on delete cascade, display_name text not null, token text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,12), is_active boolean not null default true, created_at timestamptz not null default now());
create table offers (id uuid primary key default gen_random_uuid(), cafe_id uuid not null references cafes(id) on delete cascade, title text not null check (char_length(title) <= 80), details text check (char_length(details) <= 300), valid_until date, is_active boolean not null default true, created_at timestamptz not null default now());
create table feedback (id uuid primary key default gen_random_uuid(), cafe_id uuid not null references cafes(id) on delete cascade, message text not null check (char_length(message) between 1 and 1000), rating int check (rating between 1 and 5), created_at timestamptz not null default now());
create table page_events (id bigint generated always as identity primary key, cafe_id uuid not null references cafes(id) on delete cascade, kind text not null check (kind in ('visit','menu','offers','wifi','review','feedback')), created_at timestamptz not null default now());
create index on page_events (cafe_id, kind, created_at);

-- helpers used by the policies
create function is_owner(cid uuid) returns boolean language sql security definer stable set search_path = public as $$ select exists (select 1 from cafes where id = cid and owner_id = auth.uid()) $$;
create function is_published(cid uuid) returns boolean language sql security definer stable set search_path = public as $$ select exists (select 1 from cafes where id = cid and published) $$;

alter table cafes enable row level security; alter table menu_categories enable row level security; alter table menu_items enable row level security;
alter table cafe_tables enable row level security; alter table offers enable row level security; alter table feedback enable row level security; alter table page_events enable row level security;

create policy "owner manages cafe" on cafes for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "public reads published cafe" on cafes for select using (published);
create policy "owner cats" on menu_categories for all to authenticated using (is_owner(cafe_id)) with check (is_owner(cafe_id));
create policy "public cats" on menu_categories for select using (is_visible and is_published(cafe_id));
create policy "owner items" on menu_items for all to authenticated using (is_owner(cafe_id)) with check (is_owner(cafe_id));
create policy "public items" on menu_items for select using (is_published(cafe_id));
create policy "owner tables" on cafe_tables for all to authenticated using (is_owner(cafe_id)) with check (is_owner(cafe_id));
create policy "public tables" on cafe_tables for select using (is_active and is_published(cafe_id));
create policy "owner offers" on offers for all to authenticated using (is_owner(cafe_id)) with check (is_owner(cafe_id));
create policy "public offers" on offers for select using (is_active and is_published(cafe_id));
-- anonymous customers can only ADD feedback and counters, never read them
create policy "anyone sends feedback" on feedback for insert to anon, authenticated with check (is_published(cafe_id));
create policy "owner reads feedback" on feedback for select to authenticated using (is_owner(cafe_id));
create policy "owner deletes feedback" on feedback for delete to authenticated using (is_owner(cafe_id));
create policy "anyone logs event" on page_events for insert to anon, authenticated with check (is_published(cafe_id));
create policy "owner reads events" on page_events for select to authenticated using (is_owner(cafe_id));

-- photo storage: public to view, owners can only write inside their own folder
insert into storage.buckets (id, name, public) values ('cafe-images', 'cafe-images', true) on conflict do nothing;
create policy "view images" on storage.objects for select using (bucket_id = 'cafe-images');
create policy "owner uploads" on storage.objects for insert to authenticated with check (bucket_id = 'cafe-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner deletes images" on storage.objects for delete to authenticated using (bucket_id = 'cafe-images' and (storage.foldername(name))[1] = auth.uid()::text);
