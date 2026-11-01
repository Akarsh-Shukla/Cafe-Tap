# Hosting on Cloudflare Pages, free backups, and why not Oracle (yet)

## 1. Put the site on Cloudflare Pages
1. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git, and pick your private GitHub repo.
2. Build command `npm run build`, output directory `dist`. Add the environment variable `NODE_VERSION` = `20`.
3. Add the same variables as `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_URL`, contact details). `VITE_PUBLIC_URL` is the address you will print on QR codes.
4. Deploy. You get `https://<name>.pages.dev`. Unknown paths fall back to the app automatically (single-page app), and `public/_headers` supplies the security headers.
5. In Supabase > Authentication > URL Configuration: Site URL = your Pages address, add `<address>/welcome` to Redirect URLs.
6. Check the browser console on the live site for "Refused to ..." messages (they mean the content security policy blocks something).
7. When you buy a domain, add it under the Pages project's Custom domains, change `VITE_PUBLIC_URL` and redeploy. Do this BEFORE printing any QR or NFC card.
Check Cloudflare's current free-plan terms and limits yourself before taking money.

## 2. Free daily backups (GitHub Actions)
The file `.github/workflows/backup.yml` dumps your database every night, encrypts it, and stores it as a private download for 30 days. It then deletes data past its retention period (orders 12 months, feedback 12 months, logs 12 months, visit counts 120 days).
1. In Supabase > Connect, copy the **Session pooler** connection string (it works from GitHub; the direct one often does not). Put your database password in it.
2. In GitHub > your repo > Settings > Secrets and variables > Actions, add `SUPABASE_DB_URL` (that string) and `BACKUP_PASSPHRASE` (a long phrase you will not lose).
3. Actions > Database backup > Run workflow. It should finish green and show an artifact.
4. **Restore drill (do it once):** download the artifact, decrypt with `gpg -d backup.tar.gpg > backup.tar`, `tar -xf backup.tar`, create a fresh empty Supabase project, run schema.sql and the migrations, then `pg_restore --no-owner -d "<new connection string>" public.dump`. A backup you never restored is only a hope.
Limits: uploaded images in Supabase Storage are not in this backup (keep the original photos), and the logins part is best effort (you can recreate logins by hand).
The workflow was written without access to your database. Test it before relying on it.

## 3. Staying awake and honest about free hosting
Supabase's free plan pauses a project after a week with no activity and has no automatic backups. A live café generates traffic daily and the backup job touches the database nightly, so a pause is unlikely, but quiet holiday weeks are the risk. One Supabase project serves ALL your cafés, so a paid plan is one shared cost: price the POS plan so a few POS cafés cover it, and move to the paid plan before the first café depends on POS during service.

## 4. Oracle Cloud free tier: not now
- Oracle's rules say idle Always Free instances may be reclaimed (very low CPU use over a week).
- The free Arm allowance has reportedly been cut to about half, and "out of capacity" errors are common.
- Self-hosting Supabase there means you run, patch, secure and back up a whole server stack yourself. If it fails, a café's ordering stops.
- It is a reasonable place for a hobby project or an extra backup copy, not for the only copy of a business's orders.
Revisit when you have paying POS cafés and time to maintain a server.
