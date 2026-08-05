# Landing page rebuild + one-time purchase flow

**Date:** 2026-08-05
**Status:** approved, not yet implemented

## Goal

Replace the current abstract, lead-gen-funnel landing page (`TruthLanding.tsx`,
served at `/`, `/truth`, `/truth-a`, `/truth-b`, `/truth-:campaignId`) with a
single page that explains what KÖFMAN is, pitches it directly, and sells it as
a €39 one-time purchase via an integrated Stripe checkout — replacing the
existing diagnostic-quiz lead funnel entirely.

## Non-goals

- Not building an English version of the page (German only, matching the
  target audience).
- Not migrating the app to server-side rendering (flagged as a known SEO
  ceiling, not solved here — see SEO section).
- Not deleting historical lead data (`diagnostic_submissions`, `lead_analyses`,
  `landing_leads` tables) — only the code paths that write to/read from them
  for the old funnel.
- Not a subscription/recurring billing model — single one-time charge only.

## Page structure

Single page. The scroll-snap, fade-in-on-scroll *interaction mechanic*
carries over from the current page since it's a good pattern — but this is
a genuine visual refresh, not a reskin: real app screenshots, case-study
cards, and a pricing section give it a different visual character than
today's pure-typographic scroll, restructured around explaining and
selling rather than pure tension-building copy:

1. **Hero** — headline stating what KÖFMAN *is*, subheadline, single CTA
   straight to Stripe checkout ("Jetzt für 39 € freischalten").
2. **Problem** — short framing of why this matters (much shorter than
   today's multi-screen build-up).
3. **What KÖFMAN does** — feature walkthrough (Kunden, Angebote, Rechnungen,
   Signatur, gebrandete PDFs, Dashboard), illustrated with real screenshots
   of the running app rather than mockups.
4. **Case studies** — one section per niche, mapped to the app's existing
   `business_category` values: Kfz/Werkstatt, Gebäudereinigung, Beratung,
   Kundenservice/Termine, Website/Domain-Betreuung. Each states the specific
   pain point for that niche and the matching KÖFMAN feature/solution (e.g.
   Kfz/Werkstatt: "Verträge und Angebote gehen im Papierkram unter" →
   "Digitale Angebote mit Fahrzeugdaten, live Preisberechnung, digitale
   Unterschrift"). Framed as illustrative "So hilft KÖFMAN [Branche]"
   scenarios, **not** fabricated quotes attributed to invented customers —
   presenting invented testimonials as real would be misleading.
5. **Pricing** — €39 einmalig, no subscription, what's included.
6. **Final CTA** + existing legal footer (Impressum/Datenschutz already
   exist via `LegalFooter`).

**Nav:** visible "Anmelden" (login) link, so existing customers have an
obvious way back into their account rather than only seeing a purchase
pitch.

**Auth-aware routing:** an already-authenticated visitor landing on `/`
redirects straight to `/dashboard` instead of seeing the marketing page.

## Payment & auto-provisioning

- **Stripe Checkout** (hosted, redirect-based, not a custom embedded card
  form) for the €39 one-time price. Keeps PCI scope entirely on Stripe's
  side.
- New edge function `create-checkout-session`: creates a Stripe Checkout
  Session for the price, redirects the buyer there.
- New edge function `stripe-webhook`: listens for `checkout.session.completed`,
  verifies the webhook signature, then:
  - Uses Supabase's `admin.inviteUserByEmail()` to create the buyer's login
    and send an invite email with a link to set their password.
  - Pre-creates their `organizations` + `organization_memberships` +
    `business_settings` rows, so they land in a fully working account
    immediately after setting a password — no separate onboarding step.
  - Records the purchase in a new `purchases` table (Stripe session ID,
    email, amount, timestamp) for support/record-keeping.
- New secrets on `koefman-web`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- New migration: `purchases` table.

### New page required: `/set-password`

The app currently has **no route or page that handles a Supabase
invite/recovery link at all** (confirmed by searching the codebase — no
`updateUser`, no matching route). This must be built as part of this work:
a page that reads the invite token from the URL, lets the user set a
password via `supabase.auth.updateUser()`, and logs them in.

The "invite" email template also needs the same branding treatment applied
to the confirmation template earlier (dark/premium, KÖFMAN wordmark,
consistent with the rest of the app's transactional email).

### Verification requirement

This flow must be verified end-to-end with a **real Stripe test-mode
purchase** before being considered done — not just "should work":
trigger a real test purchase → confirm the webhook fires → confirm the
invite email actually arrives → click it → set a password on the real
`/set-password` page → confirm landing in a working, pre-provisioned
account. Switching Stripe to live keys is a deliberate, separate step
taken only after this is confirmed working.

## Removing the old lead funnel

**Remove (code only):**
- `/diagnose` route + `src/pages/DiagnosticIntake.tsx`
- `/admin/leads` route + `src/pages/admin/AdminLeads.tsx` +
  `src/components/admin/LeadProcessStatus.tsx`
- `/truth`, `/truth-a`, `/truth-b`, `/truth-:campaignId` routes (A/B
  variants feeding the same funnel) and the `Truth`/`TruthA`/`TruthB`
  page components
- `supabase/functions/generate-lead-analysis` edge function
- Nav entries pointing to any of the above

**Keep (data):** `diagnostic_submissions`, `lead_analyses`, `landing_leads`
tables stay in the database untouched (19-24 rows of real historical
leads) — only the code that references them is removed, not the data
itself, in case of manual follow-up later.

## SEO

- Proper semantic heading structure (`<h1>`/`<h2>`/`<h3>`) — the current
  page uses plain `<div>`s for all text, a real gap this fixes.
- Updated `<title>`/meta description/OG tags matching the new pitch copy.
- Keyword-rich German copy woven naturally into the pitch (Handwerker,
  Rechnungen, Angebote, Kleinunternehmer, Büroverwaltung) rather than
  stuffed in artificially.
- **Known limitation:** this remains a client-rendered SPA (no SSR/SSG).
  Google generally crawls JS-rendered pages reasonably well, but this is
  not as strong as true server-side rendering for indexing speed or other
  crawlers (e.g. social link-preview bots). Moving to a server-rendered
  framework would fully solve this but is a much larger, separate effort —
  out of scope here.

## Rollout plan

1. Build the new page + Stripe flow on a new route (e.g. `/pitch-preview`)
   — `koefman.de` keeps serving the current homepage unchanged throughout
   development.
2. Test the full loop there in Stripe **test mode**, including the real
   email → set-password flow (see Verification requirement above).
3. Once reviewed and approved live on the preview route, in one cutover
   change: point `/` at the new page, remove the old funnel (per above),
   and switch Stripe to live keys as a deliberate last step.

This sequencing exists because today's session already had two live-site
outages from smaller changes — keeping the current homepage untouched
until the new one is proven end-to-end (including a real payment) is worth
the small extra step of building on a separate route first.
