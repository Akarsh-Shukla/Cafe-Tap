# POS release gates and test plan
No control is "done" until it has evidence. Do not onboard a paying café on the POS plan until every gate below is ticked.

## Before anything
1. Create a second Supabase project called `cafetap-staging`. Run `schema.sql`, then migrations 2, 3, 4, 5, 6 in order.
2. Run `supabase/tests/pos_tests.sql` there. Every block must print PASS. Note any FAIL with its code (for example T6c).
3. Only after staging passes, run migrations 5 and 6 on production, then deploy the matching app.

## Gates (spec section 5 and the security addendum)
| Gate | Evidence |
|---|---|
| Tenant isolation | pos_tests T3 passes. Also log in as owner A and owner B in two browsers and try each other's pages. |
| Platform admin boundary | pos_tests T4 passes. In the admin dashboard there is no Orders or Sales tab. |
| Plan enforcement | pos_tests T1c and T7 pass. A Basic café has no POS tabs. |
| Roles | pos_tests T5. Turn a staff member off in POS setup; their next page load shows "not ready". |
| Secrets | Search the repo and the built `dist/` for `service_role`. There must be no result. |
| Order and payment integrity | pos_tests T1e to T1j, T6. |
| Public abuse | Send 10 orders quickly from one phone: the 9th is refused. Try a copied table link from another city: refused. |
| XSS | Save a café name and a feedback message containing `<script>alert(1)</script>`; both appear as plain text. |
| Recovery | Export your tables, then restore them into the staging project and compare row counts. |
| Deployment | HTTPS, auth redirect URLs, security headers, no "Refused to…" errors in the browser console. |

## Manual tests on real phones (no tool can replace these)
- Android phone on mobile data and another on café Wi‑Fi: location granted, denied, GPS off, standing outside.
- Two phones order at the same table within the same minute, then staff close the table; a new order starts a fresh bill.
- Double-tap "Place order"; turn off the network mid-order and retry: one order only.
- Staff prints a bill on a normal printer and on the café's thermal printer if there is one.

## Known limits (state them honestly to cafés)
- GPS can be spoofed and a QR can be photographed. The location check deters casual fake orders; it doesn't prevent a determined person.
- UPI and cash are recorded by staff. CafeTap does not verify them with a bank.
- Staff logins are created by the platform operator in Supabase Auth, then permissions are given by the owner.
- Polling every 8 seconds, not live push.
- Bills are not GST tax invoices.
