# NTP Analytics

The app uses the Tactical Drillboard Supabase project for authentication and its own
`analytics_players` and `analytics_matches` tables. Match
and player records are stored in Supabase, not browser local storage. The existing
`tactical_drills` table is separate and unchanged.

## Run locally

Use Node 22.12 or newer. Install locked dependencies with `npm ci`, then run
`npm run dev`. Set these Vite variables in `.env` (see `.env.example`):

```text
VITE_SUPABASE_URL=https://ewabacqaduddpnvospzd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<the project's publishable key>
```

Never put a Supabase secret or service-role key in a `VITE_` variable. Vite embeds
those values in browser code.

## Accounts and access

Users can sign in with an existing Tactical Drillboard account or sign up in
Analytics. A new signup creates a user in the **shared Tactical Drillboard Auth
project**, so it may also grant access to Tactical Drillboard, depending on that
app's own authorization rules. Analytics has no separate approval step. Its
database policies limit each signed-in user to their own player and match rows.

### Arriving from the NTP Superapp

Coaches and directors who tap the **Analytics** tile in the NTP Superapp land
here already signed in and never see the form. The superapp asks its own
`drills-sso` edge function for a short-lived, HMAC-signed code and sends them on
as `?sso=<code>`. `ssoHandoff.ts` posts that code to the `sso-redeem` edge
function — the same one Tactical Drillboard uses, since both apps sit in this
Supabase project — which checks the signature and returns a one-time token we
exchange for a session. The code is stripped from the address bar as the page
loads and expires after 60 seconds, and no password crosses between the apps.

The account is matched by email and created on first arrival, so a coach ends up
with a single account across Analytics and Tactical Drillboard. Analytics needs
no extra configuration for this; the superapp needs `VITE_ANALYTICS_URL` set to
this app's deployed URL. When a hand-off fails — an expired code, a role the
superapp will not hand over — the coach lands on the sign-in form with the
reason shown rather than at a dead end.

When Supabase identifies an existing email during signup, Analytics directs the
user to sign in. Supabase can deliberately obscure whether an email is already
registered, so some cases instead receive a generic email-confirmation message
that also points existing users to sign in. Do not use a service-role key in the
browser to look up accounts.

If email confirmation is enabled, add each local and deployed site URL to the
Supabase Auth redirect allowlist. Configure an email provider that can deliver
confirmation messages to your intended users. These Auth settings are shared
with Tactical Drillboard.

The original database setup is in `supabase/schema.sql`. The follow-up
`supabase/allow_signed_in_analytics.sql` removes the original approval policy
and leaves the now-unused membership table intact. Both migrations have already
been applied to the shared project; run them in that order in a new project.

## Import data from the old app

On the Matches screen, **Import browser data** imports legacy records found on the
current website origin. **Import JSON backup** accepts a downloaded backup and
keeps existing database records when IDs match. The old browser data is not
deleted automatically.

Browser local storage is tied to the website origin. Vercel cannot read storage
left at `ntp-analytics.netlify.app`. To migrate existing users without manually
extracting JSON, publish this new build at the **same Netlify URL first**, have
each coach sign in and import browser data, then switch the site to Vercel. Do
not remove the old site until those imports are confirmed. If a user already has
a JSON backup, they can import it from Vercel instead.

## Vercel

Import the repository as a Vite project. Build command: `npm run build`; output
directory: `dist`. Set the same two `VITE_` variables in Vercel for every
deployment environment. No server-side secret is needed. This app currently has
no client-side routes requiring a Vercel rewrite.

When Analytics later moves to its own Supabase project, migrate only the
`analytics_*` tables and relevant Auth users. Project Auth identities, tokens,
and configuration do not move simply by changing the project URL.
