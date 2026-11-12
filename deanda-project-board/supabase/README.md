# Supabase setup

The dashboard runs on the bundled spreadsheet data until two environment
variables are set; then it reads and writes this database, and everyone signs
in with their @deanda.capital Google account.

## 1. Database

Supabase → **SQL Editor** → New query:

1. Paste all of `schema.sql`, **Run**. Creates the tables, the access rules
   (only signed-in @deanda.capital accounts can read or write), the monthly
   reset (runs every hour via pg_cron; New York time) and realtime on tasks.
2. Paste all of `seed.sql`, **Run**. Loads the team, pillars, workstreams and
   the 538 tasks from the November 2026 sheet.

Both are safe to run again. `seed.sql` is generated: `node supabase/make-seed.mjs`.

## 2. Google sign-in

**Google Cloud Console** (signed in with your @deanda.capital account):

1. Create a project, e.g. "Project Board".
2. **OAuth consent screen**: user type **Internal**; app name and support email.
3. **Credentials → Create credentials → OAuth client ID** → *Web application*:
   - Authorized JavaScript origins: `https://deanda-dashboard.vercel.app`
   - Authorized redirect URI: `https://cdycjbsnitayhsxditll.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**.

**Supabase**:

1. **Authentication → Sign In / Providers → Google**: enable, paste the Client ID
   and secret, save.
2. **Authentication → URL Configuration**:
   - Site URL: `https://deanda-dashboard.vercel.app`
   - Redirect URLs: add `https://deanda-dashboard.vercel.app/**` and
     `http://localhost:5173/**`

## 3. Connect the app

**Vercel → Project → Settings → Environment Variables** (Production and Preview):

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://cdycjbsnitayhsxditll.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → the **anon / publishable** key |

Then redeploy. For local development, copy `.env.example` to `.env.local` and
fill in the same two values.

Never put the **service_role / secret** key in the app or in Vercel: it bypasses
the access rules.

## Syncing from the spreadsheet

`sync-2026-11-sheet.sql` brings in the latest `Project_Board_Nov_2026.xlsx`:
59 edited tasks and 156 new ones. Run it once in the SQL Editor; the result row
shows how many were edited, added and skipped. A task someone already changed in
the app is skipped rather than overwritten, nothing is deleted, and running it
twice changes nothing. Then `remove-2026-11-brayden.sql` deletes the 7 tasks no
longer on Brayden's tab. (`seed.sql` already reflects both for a fresh setup.)

## How the month reset works

`close_ended_months()` runs at :07 every hour. On the first run after a month
ends (New York time) it calls `close_month('YYYY-MM')`, which saves the month's
totals in `months` (what Insights compares) and deletes its completed tasks;
open tasks carry over. Months are only closed once, and never before
`board_meta.first_month`.
