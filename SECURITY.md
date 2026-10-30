# CafeTap security checklist
## Accounts (most important: an attacker goes after YOU, not the code)
- Turn on two-factor sign-in for GitHub, Vercel/Cloudflare, Supabase and the email you use for your admin login.
- Use a unique password for each, in a password manager. Your admin email should be one only you use.
- Supabase > Authentication: turn ON "Confirm email", set minimum password length to 10, set Site URL to your live domain and add it under Redirect URLs.
## Secrets
- Only the Supabase URL and the anon (publishable) key go in the frontend. NEVER use the service_role key in this project.
- .env.local is git-ignored. If a key ever reached GitHub, rotate it in Supabase straight away.
- All VITE_ values (WhatsApp, email, domain) are PUBLIC by design. Never put anything private in a VITE_ variable.
## Database
- Run supabase/migration-4.sql, then confirm its last query returns no rows.
- Two-account test: log in as owner A and owner B. Try opening and editing the other café from the dashboard. Both must fail.
- Only add admins with SQL: insert into admins (user_id) select id from auth.users where email = '...';
## Website
- vercel.json (or public/_headers on Cloudflare/Netlify) adds security headers. After deploying, open the site, press F12, look at the Console. Any "Refused to ..." message means the CSP blocks something: tell me the message and I will adjust it.
- Test: login, menu image upload, QR page, guest page, feedback form.
## Before the first paying client
- Use hosting that allows commercial use, set a domain, and test password reset and email confirmation links on the live site.
- Export your tables weekly if you are on the free database plan (it has no automatic backups).

## v9 additions
- Run migration-5.sql: owner emails are no longer public, table codes can't be listed, platform admin can't read feedback or visit counts, uploads are limited to owners and 2 MB images.
- Turn OFF public sign-ups in Supabase and create logins yourself. Our app no longer offers "Create account".
- Geolocation is allowed only for this site (Permissions-Policy geolocation=(self)). Do not widen it.
- POS: see docs/POS_TEST_PLAN.md. Run supabase/tests/pos_tests.sql on a staging project first.
