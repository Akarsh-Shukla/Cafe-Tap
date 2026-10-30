# CafeTap
Café page with NFC/QR: customer home (menu, offers, Wi-Fi, review, anonymous feedback) + owner dashboard.
Setup: 1) Supabase SQL Editor: run supabase/schema.sql  2) copy .env.example to .env.local and fill keys
3) npm install  4) npm run dev -- --host   5) open /login, create an account, create your café, tick Published.
Customer page: /your-slug   Table page: /your-slug/t/TOKEN (generated in Tables & QR)

## Admin (you) vs owners
1) Run supabase/migration-2.sql  2) sign up in the app  3) run the last (commented) line of that file with your email
You then land on /admin: add cafés, manage QR/NFC, billing and notes. Owners only see their own menu/page.
## Deploying: see the checklist in the chat (vercel.json is included so QR links like /your-cafe work).

## v9: two plans (Basic + POS)
Run in this order on Supabase (staging first for POS): migration-4.sql, migration-5.sql, migration-6.sql. Then deploy.
Assign a café's plan in Admin > café > Business > Product plan. POS cafés get Orders, Sales and POS setup tabs; staff log in at /login.
Disable public sign-ups in Supabase (Authentication > Providers > Email > "Allow new users to sign up" off) and create owner/staff logins yourself (Authentication > Users > Add user / Invite).
Landing artwork: add real files to public/showcase and public/art and list them in src/data/showcase.js and src/data/artworks.js. Empty lists keep those sections hidden.
See docs/POS_TEST_PLAN.md before using POS with a real café.
