# SPEC.md — KÖFMAN (Native iOS Rebuild, v1)

The precise, native-ready blueprint for the rebuild. Scope reflects the locked
decisions: **lean MVP, single-user, fresh Supabase schema, iOS only.** The two
failures of the old build are treated as first-class requirements: **branded
high-end PDFs** and a **closed-loop offer → signature → invoice → paid lifecycle.**

---

## 0. Phase 0 — Legacy web app stabilization (current, separate codebase)

Before the rebuild described in this spec begins, the **existing** Vite +
React + Supabase web app (this repo, live at koefman.de) needed to be
stabilized and secured — it's a different codebase from the Expo/React
Native rebuild below and is tracked here only so it isn't mistaken for
progress against the sections that follow.

**In scope (Phase 0):**
- Security: fixed an `organization_memberships` RLS policy that allowed
  cross-organization privilege escalation.
- Infrastructure: original Supabase project became inaccessible (account
  unrecoverable); migrated the app to a fresh project (`koefman-web`) with
  all schema/RLS/edge functions replayed.
- Code health: eliminated all `@typescript-eslint/no-explicit-any` lint
  errors (492 → 0) across the codebase.
- Email delivery: configured custom SMTP (Resend) + branded confirmation
  email template; fixed `auth.site_url` pointing at `localhost`.
- Bug fixes: admin-bootstrap gap causing new accounts to skip
  onboarding/org-creation; a date-formatting crash that blanked the public
  offer/invoice/contract pages when the underlying record hadn't loaded yet.

**Known outstanding (not yet applied):**
- `invoices.public_token` / `org_documents.public_token` are missing a DB
  default (`DEFAULT (gen_random_uuid())::text`), so public share links can
  resolve to `NULL` until a document is first sent. Root cause diagnosed,
  fix drafted, not yet applied to `koefman-web`.

**Relationship to the rebuild below:** independent. Phase 0 keeps the
current web app (and its real customer data) working at koefman.de; it does
not block, gate, or share code/backend with the Expo/React Native rebuild.

---

## 1. Product summary

KÖFMAN Simple Office — a fast, premium, mobile-native office tool for a single
small-service-business owner (car garages, cleaning firms). Multilingual:
**German (default), Arabic (RTL), English.** Dark, premium aesthetic; low
cognitive load; large tap targets; card-based lists.

### In scope (v1)
Auth · Customers · Offers/quotations · Invoices · Signature acceptance ·
Branded PDF export · Dashboard · Settings (incl. branding).

### Explicitly out of scope (later phases)
Multi-tenant organizations, roles, admin/impersonation · Contracts ·
Leads/CRM funnel & analytics · Recurring invoices · Expenses & tax export ·
Diagnostic/intake forms · Document templating engine · Email edge functions.

---

## 2. Target & stack

- **Platform:** iOS only (iPhone-first; iPad-tolerant layout).
- **App framework:** **Expo / React Native (TypeScript).** Rationale: reuses the
  existing React business logic, Supabase client, zod schemas, and i18n files;
  mature native signature and PDF libraries; solid RTL support; fastest path to a
  smooth native build with Claude Code + Claude Design.
  - *Alternative considered:* SwiftUI — maximal Apple-native polish, but discards
    all reuse and requires a full Swift rewrite. Choose only if native-Apple feel
    is a hard requirement over speed. **Default = Expo/RN.**
- **Backend:** New, clean Supabase project (Postgres + Auth + Storage). Single
  owner per install; RLS keys every row to `auth.uid()`.
- **PDF:** **`expo-print`** rendering an HTML/CSS template → this is the fix for
  "branded PDFs never delivered." Full CSS control gives real design quality,
  unlike the old jsPDF hand-drawing. `expo-sharing` for share/save/print.
- **Signatures:** `react-native-signature-canvas` (or Skia-based) → PNG data-URL.
- **Data/forms:** `@tanstack/react-query`, `react-hook-form`, `zod`.
- **i18n:** port existing `de/en/ar` files; RTL via I18nManager + layout mirroring.

---

## 3. The closed loop (core requirement)

The old build "was not a closed loop." v1 must make the full lifecycle connect
with no dead ends. State machines:

**Offer:** `draft → sent → signed(accepted) | rejected`
- `draft`: editable, no number burned yet (or reserved).
- `sent`: shared via link / shown to customer for signature.
- `signed`: customer captures signature → acceptance recorded → **"Convert to
  invoice" becomes available.** (Guard against duplicate conversion.)
- `rejected`: terminal; can be duplicated into a new draft.

**Invoice:** `open → paid | overdue | cancelled`
- Created manually **or** from a signed offer (carries over customer + line items).
- `overdue` derived automatically when due date < today and still `open`.
- `paid`: user marks paid (records date) → loop closes.

**Loop wiring that must exist:**
Offer signed → one-tap convert → invoice open → mark paid → reflected on
dashboard and customer detail. Every entity links back to its customer, and the
customer detail page shows all related offers + invoices with live status.

---

## 4. Data model (fresh, single-user)

Every table has `id uuid pk`, `user_id uuid` (= owner, RLS `= auth.uid()`),
`created_at`, `updated_at`. Only MVP tables:

- **profiles** — `id (=auth user)`, `email`, `display_name`.
- **business_settings** (one row per user) — `business_name`, `address`,
  `email`, `phone`, `tax_number`, `vat_id`, `logo_url`, **branding**
  (`brand_primary_color`, `brand_accent_color`, `pdf_footer_note`), `currency`,
  `default_tax_rate`, `payment_terms`, `offer_number_prefix`,
  `invoice_number_prefix`, `next_offer_seq`, `next_invoice_seq`, `language`.
- **customers** — `customer_type` (`private` | `business`), `name`,
  `contact_person?`, `phone`, `email`, `address`, `notes`, plus optional
  industry fields: `vehicle_plate?`, `vehicle_brand?`, `vehicle_model?`,
  `repair_notes?`, `property_size?`, `cleaning_frequency?`, `service_location?`
  (shown conditionally by business type).
- **offers** — `offer_number`, `customer_id fk`, `date`, `status`
  (`draft|sent|signed|rejected`), `notes?`, `internal_notes?`, `subtotal`,
  `tax_total`, `grand_total`, `currency`.
- **offer_items** — `offer_id fk`, `title`, `description?`, `quantity`, `unit`,
  `unit_price`, `tax_rate`, `line_total`, `sort_order`.
- **offer_acceptances** — `offer_id fk`, `signature_image` (PNG data-URL),
  `signature_text?` (typed-name fallback), `signed_at`, `signer_name`.
- **invoices** — `invoice_number`, `customer_id fk`, `source_offer_id? fk`,
  `date`, `due_date`, `status` (`open|paid|overdue|cancelled`), `paid_at?`,
  `notes?`, `subtotal`, `tax_total`, `grand_total`, `currency`.
- **invoice_items** — same shape as `offer_items`, `invoice_id fk`.

Number sequences (`next_offer_seq` / `next_invoice_seq`) increment atomically on
finalize to avoid gaps/dupes. Money stored as integer minor units (cents) to
avoid float errors; tax computed per line then summed.

---

## 5. Feature specs & acceptance criteria

**Auth & language**
- Supabase email/password; protected routes; persisted session; unauthenticated
  → login. Language switch (DE/AR/EN) persists; Arabic mirrors layout (RTL).
- *Done when:* fresh install → sign up → land on dashboard in the persisted
  language; force-quit and reopen stays signed in.

**Customers**
- List (card-based, searchable), create, edit, detail. Detail shows related
  offers + invoices with status. Industry fields appear by business type.
- *Done when:* create a customer, see it in list/search, open detail, and see
  its (initially empty) offers/invoices sections.

**Offers**
- Create with line items (title, desc, qty, unit, unit price, tax rate); **live
  total** as you edit; statuses; duplicate; PDF export; convert-to-invoice when
  signed. Filter list by status.
- *Done when:* build a 3-line offer, totals compute live and match the PDF, mark
  it sent, capture a signature, and convert to an invoice in one tap.

**Invoices**
- Create manually or from a signed offer; edit; statuses; auto-overdue; mark
  paid; PDF export; list with search + status filter. Confirm before creating a
  second invoice from the same offer.
- *Done when:* an offer-derived invoice carries over customer + items, goes
  overdue past due date, and marking paid updates dashboard + customer detail.

**Signature acceptance**
- `SignaturePad` (native canvas) captures a PNG; requires non-empty stroke;
  clear button; stores image + signed date + signer name on the offer.
- *Done when:* signing a sent offer flips it to `signed`, records the acceptance,
  and unlocks conversion.

**Branded PDF (headline fix)**
- HTML/CSS template rendered by `expo-print`, driven by `business_settings`
  branding (logo, colors, business info, footer, VAT/tax number) + document
  data. One template for offers, one for invoices, visually premium and
  print-correct. Share/save/print via `expo-sharing`.
- *Done when:* a generated invoice PDF shows the business logo, brand colors,
  full line-item table with subtotal/tax/total, tax IDs, and payment terms —
  and looks like a designed document, not a form dump.

**Dashboard**
- Cards: total customers, total offers, total invoices, open / paid / overdue
  invoices, recent activity. Stack vertically on mobile.

**Settings**
- Business profile, branding (logo upload to Supabase Storage, colors, footer),
  document number formats, currency, default tax rate, payment terms, language,
  dark mode default.

---

## 6. Non-functional

- **Feel:** native navigation, gestures, momentum scroll; no web-view jank.
- **Security:** RLS on every table = `auth.uid()`; no secrets in the repo;
  `.env` git-ignored; signatures/logos in access-controlled Storage buckets.
- **Offline (nice-to-have v1.1):** cache reads via react-query; queue writes.
- **Money & tax:** integer minor units; per-line tax; German 19% default
  configurable.

---

## 7. Build phases (one milestone at a time)

1. **Foundation:** Expo app, Supabase project + schema + RLS, auth, i18n/RTL,
   navigation shell, theme.
2. **Customers** (CRUD + search + detail).
3. **Offers** (items, live totals, statuses, duplicate).
4. **Signatures** (capture + acceptance + status flip).
5. **Invoices** (manual + from signed offer, statuses, mark paid, overdue).
6. **Branded PDF** template for both documents.
7. **Dashboard + Settings** (incl. branding upload).
8. Polish pass: empty states, errors in all 3 languages, RTL QA, performance.

Gate each milestone: build, run on device, confirm acceptance criteria, then
proceed.

---

## 8. Handoff to Claude Design

Design deliverables to request, mobile-first, dark premium, RTL-aware:
- Design tokens (color incl. brand accents, type scale, spacing, radius).
- Screens: login, dashboard, customer list + detail + form, offer list + editor
  (with live totals + add-item), signature screen, invoice list + detail, PDF
  template layouts (offer + invoice), settings + branding.
- States for each: empty, loading, error, filled.

Feed Claude Design the phone screenshots of the old app as "what to beat," plus
this spec's screen list as the target.
