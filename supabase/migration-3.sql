-- Run ONCE in Supabase SQL Editor. Adds item badges, veg/non-veg marks and the two new themes.
alter table menu_items add column badge text check (badge in ('bestseller','chefs','new','popular'));
alter table menu_items add column diet text check (diet in ('veg','nonveg','egg'));
alter table cafes drop constraint cafes_theme_check;
alter table cafes add constraint cafes_theme_check check (theme in ('roastery','bakery','chai','sage','mocha'));
