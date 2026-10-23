# CafeTap
Café page with NFC/QR: customer home (menu, offers, Wi-Fi, review, anonymous feedback) + owner dashboard.
Setup: 1) Supabase SQL Editor: run supabase/schema.sql  2) copy .env.example to .env.local and fill keys
3) npm install  4) npm run dev -- --host   5) open /login, create an account, create your café, tick Published.
Customer page: /your-slug   Table page: /your-slug/t/TOKEN (generated in Tables & QR)

## Admin (you) vs owners
1) Run supabase/migration-2.sql  2) sign up in the app  3) run the last (commented) line of that file with your email
You then land on /admin: add cafés, manage QR/NFC, billing and notes. Owners only see their own menu/page.
## Deploying: see the checklist in the chat (vercel.json is included so QR links like /your-cafe work).
