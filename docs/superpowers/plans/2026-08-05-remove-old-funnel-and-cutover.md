# Remove Old Lead Funnel + Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the old diagnostic-quiz lead funnel (code only, historical data stays), then cut the new pitch page over to `/` as the live homepage, switching Stripe to live keys as the final step.

**Architecture:** Straightforward file/route deletions plus one router swap and one index.html metadata update. No new abstractions.

**Tech Stack:** React Router, existing Vite/React app structure.

## Global Constraints

- **Do not drop or modify** `diagnostic_submissions`, `lead_analyses`, or `landing_leads` tables/data — only remove the code that references the old funnel.
- **Do not touch** `/leads`, `src/pages/Leads.tsx`, or its nav entry (`AppLayout.tsx:57`) — that's an unrelated, in-use, end-user CRM feature, not part of the old lead-gen funnel being removed.
- Requires both `2026-08-05-stripe-purchase-flow.md` (verified working) and `2026-08-05-pitch-landing-page.md` (reviewed and approved on `/pitch-preview`) to be complete before starting this plan.
- Every removal task must end with `npx tsc --noEmit` passing — a leftover import of a deleted file is a build break, not a warning.

---

### Task 1: Remove the diagnostic-intake funnel

**Files:**
- Delete: `src/pages/DiagnosticIntake.tsx`
- Delete: `supabase/functions/generate-lead-analysis/`
- Modify: `src/App.tsx`

- [ ] **Step 1: Delete the files**

```bash
git rm src/pages/DiagnosticIntake.tsx
git rm -r supabase/functions/generate-lead-analysis
```

- [ ] **Step 2: Remove the route and import from `src/App.tsx`**

Remove this import line (currently line 55):
```tsx
import DiagnosticIntake from "@/pages/DiagnosticIntake";
```
Remove this route (currently line 121):
```tsx
<Route path="/diagnose" element={<DiagnosticIntake />} />
```

- [ ] **Step 3: Undeploy the edge function from koefman-web**

```bash
export SUPABASE_ACCESS_TOKEN=<the access token>
npx supabase link --project-ref stadcjvmhawvdxnxnndp
npx supabase functions delete generate-lead-analysis
```
Expected: confirmation the function was removed. (If this command isn't available in your CLI version, deleting it via the Supabase dashboard's Edge Functions page is equivalent — the goal is just that the deployed function no longer exists.)

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx eslint src/App.tsx
```
Expected: no errors, no reference to `DiagnosticIntake` anywhere (confirm with `grep -rn "DiagnosticIntake" src/` — expect no matches).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "Remove diagnostic-intake lead funnel (code only, data retained)"
```

---

### Task 2: Remove admin lead review

**Files:**
- Delete: `src/pages/admin/AdminLeads.tsx`
- Delete: `src/components/admin/LeadProcessStatus.tsx`
- Modify: `src/App.tsx`, `src/components/admin/AdminLayout.tsx`, `src/pages/admin/AdminDashboard.tsx`

- [ ] **Step 1: Delete the files**

```bash
git rm src/pages/admin/AdminLeads.tsx
git rm src/components/admin/LeadProcessStatus.tsx
```
(`LeadProcessStatus.tsx` has no other importers — confirmed via `grep -rn "LeadProcessStatus" src/` returning only `AdminLeads.tsx` and itself before this deletion.)

- [ ] **Step 2: Remove the route and import from `src/App.tsx`**

Remove this import line (currently line 46):
```tsx
import AdminLeads from "@/pages/admin/AdminLeads";
```
Remove this route (currently line 82):
```tsx
<Route path="/admin/leads" element={<AdminLeads />} />
```

- [ ] **Step 3: Remove the nav entry from `src/components/admin/AdminLayout.tsx`**

Change:
```tsx
const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Übersicht', end: true },
  { to: '/admin/leads', icon: Inbox, label: 'Leads' },
  { to: '/admin/documents', icon: FileText, label: 'Dokumente' },
  { to: '/admin/accounts', icon: Users, label: 'Konten' },
```
to:
```tsx
const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Übersicht', end: true },
  { to: '/admin/documents', icon: FileText, label: 'Dokumente' },
  { to: '/admin/accounts', icon: Users, label: 'Konten' },
```
If `Inbox` is no longer used anywhere else in that file after this change, remove it from the icon import too (check with `grep -n "Inbox" src/components/admin/AdminLayout.tsx`).

- [ ] **Step 4: Rewrite `src/pages/admin/AdminDashboard.tsx` without leads**

Replace the full file with:
```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const [offers, invoices, contracts] = await Promise.all([
        supabase.from('offers').select('id, status', { count: 'exact' }),
        supabase.from('invoices').select('id, status', { count: 'exact' }),
        supabase.from('contracts').select('id, status', { count: 'exact' }),
      ]);

      const openOffers = offers.data?.filter(o => o.status === 'sent').length ?? 0;
      const openInvoices = invoices.data?.filter(i => i.status === 'open').length ?? 0;

      return {
        totalOffers: offers.count ?? 0,
        openOffers,
        totalInvoices: invoices.count ?? 0,
        openInvoices,
        totalContracts: contracts.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground">Übersicht</h2>

      {/* Urgent actions */}
      <div className="space-y-2">
        {(stats?.openOffers ?? 0) > 0 && (
          <button
            onClick={() => navigate('/admin/documents')}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {stats!.openOffers} offene Angebote
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {(stats?.openInvoices ?? 0) > 0 && (
          <button
            onClick={() => navigate('/admin/documents')}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {stats!.openInvoices} offene Rechnungen
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/admin/documents')} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
          <p className="text-xs text-muted-foreground mb-1">Angebote</p>
          <p className="text-2xl font-bold text-foreground">{stats?.totalOffers ?? 0}</p>
        </button>
        <button onClick={() => navigate('/admin/documents')} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
          <p className="text-xs text-muted-foreground mb-1">Rechnungen</p>
          <p className="text-2xl font-bold text-foreground">{stats?.totalInvoices ?? 0}</p>
        </button>
        <button onClick={() => navigate('/admin/documents')} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
          <p className="text-xs text-muted-foreground mb-1">Verträge</p>
          <p className="text-2xl font-bold text-foreground">{stats?.totalContracts ?? 0}</p>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npx eslint src/App.tsx src/components/admin/AdminLayout.tsx src/pages/admin/AdminDashboard.tsx
grep -rn "AdminLeads\|LeadProcessStatus" src/
```
Expected: no errors, no matches from the grep.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/admin/AdminLayout.tsx src/pages/admin/AdminDashboard.tsx
git commit -m "Remove admin lead review UI (code only, data retained)"
```

---

### Task 3: Remove the A/B "Truth" funnel pages

**Files:**
- Delete: `src/pages/Truth.tsx`, `src/pages/TruthA.tsx`, `src/pages/TruthB.tsx`
- Delete: `src/components/TruthLanding.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Delete the files**

```bash
git rm src/pages/Truth.tsx src/pages/TruthA.tsx src/pages/TruthB.tsx
git rm src/components/TruthLanding.tsx
```

- [ ] **Step 2: Remove the routes and imports from `src/App.tsx`**

Remove these import lines (currently lines 52-54):
```tsx
import Truth from "@/pages/Truth";
import TruthA from "@/pages/TruthA";
import TruthB from "@/pages/TruthB";
```
Remove these routes (currently lines 117-120):
```tsx
<Route path="/truth" element={<Truth />} />
<Route path="/truth-a" element={<TruthA />} />
<Route path="/truth-b" element={<TruthB />} />
<Route path="/truth-:campaignId" element={<Truth />} />
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
grep -rn "TruthLanding\|from \"@/pages/Truth\"\|from \"@/pages/TruthA\"\|from \"@/pages/TruthB\"" src/
```
Expected: no errors, no matches.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Remove A/B truth-page lead funnel variants"
```

---

### Task 4: Cutover — `/` becomes the pitch page

**Files:**
- Delete: `src/pages/LandingPage.tsx`
- Modify: `src/App.tsx`, `index.html`

- [ ] **Step 1: Delete the old landing page**

```bash
git rm src/pages/LandingPage.tsx
```

- [ ] **Step 2: Repoint `/` and `/landing` at `PitchLanding`, remove `/pitch-preview`**

In `src/App.tsx`, remove the `LandingPage` import and replace:
```tsx
<Route path="/" element={<LandingPage />} />
<Route path="/landing" element={<LandingPage />} />
```
with:
```tsx
<Route path="/" element={<PitchLanding />} />
<Route path="/landing" element={<PitchLanding />} />
```
Remove the now-redundant preview-only route (`PitchLanding` is already imported from the previous plan):
```tsx
<Route path="/pitch-preview" element={<PitchLanding />} />
```

- [ ] **Step 3: Update SEO metadata in `index.html`**

Replace the full `<head>` content with:
```html
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KÖFMAN – Angebote, Rechnungen & digitale Unterschrift für Handwerker</title>
    <meta name="description" content="KÖFMAN ist die einfache Büroverwaltung für Handwerker, Werkstätten und Dienstleister: Angebote, Rechnungen und digitale Unterschrift an einem Ort. Einmalzahlung 39 €.">
    <meta name="author" content="KÖFMAN" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#1a1a1a" />

    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/xNRG6bvpdPbDyAqrx6p7iwxVorB2/social-images/social-1774801153723-koefman_logo_wordmark_white.webp">

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/xNRG6bvpdPbDyAqrx6p7iwxVorB2/social-images/social-1774801153723-koefman_logo_wordmark_white.webp">

    <meta property="og:title" content="KÖFMAN – Angebote, Rechnungen & digitale Unterschrift für Handwerker">
    <meta name="twitter:title" content="KÖFMAN – Angebote, Rechnungen & digitale Unterschrift für Handwerker">
    <meta property="og:description" content="KÖFMAN ist die einfache Büroverwaltung für Handwerker, Werkstätten und Dienstleister. Einmalzahlung 39 €.">
    <meta name="twitter:description" content="KÖFMAN ist die einfache Büroverwaltung für Handwerker, Werkstätten und Dienstleister. Einmalzahlung 39 €.">
</head>
```
(This removes the leftover `<!-- TODO -->` comments and the `twitter:site content="@Lovable"` tag from the original scaffold, and drops the two stray blank lines that were there before.)

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
grep -rn "LandingPage" src/App.tsx
```
Expected: no errors, no remaining reference to the deleted `LandingPage`.

- [ ] **Step 5: Commit, push, publish**

```bash
git add src/App.tsx index.html
git commit -m "Cut over homepage to the new pitch landing page"
git push origin main
```
Then publish via Lovable — this is the change that takes the new page live at `koefman.de`.

- [ ] **Step 6: Verify live**

Open `https://koefman.de/` — expect the new pitch page, not the old one. Open `https://koefman.de/diagnose`, `https://koefman.de/admin/leads`, `https://koefman.de/truth` — expect each to hit the app's catch-all/not-found behavior, not the old pages.

---

### Task 5: Switch Stripe to live mode

**Files:** none — Supabase secrets + Stripe dashboard only.

- [ ] **Step 1: Get live-mode keys from Stripe**

In the Stripe dashboard, toggle out of test mode. Get the live secret key (`sk_live_...`) from Developers → API keys.

- [ ] **Step 2: Register a live-mode webhook**

Developers → Webhooks (make sure you're viewing live mode, not test mode) → Add endpoint, same URL as before: `https://stadcjvmhawvdxnxnndp.supabase.co/functions/v1/stripe-webhook`, event `checkout.session.completed`. Copy the live signing secret (`whsec_...`).

- [ ] **Step 3: Update the secrets**

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/stadcjvmhawvdxnxnndp/secrets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {"name":"STRIPE_SECRET_KEY","value":"sk_live_YOUR_LIVE_KEY"},
    {"name":"STRIPE_WEBHOOK_SECRET","value":"whsec_YOUR_LIVE_WEBHOOK_SECRET"}
  ]'
```

- [ ] **Step 4: One real live purchase to confirm**

This is the moment real money changes hands for the first time — do one real purchase yourself (you can refund it immediately after in the Stripe dashboard) and repeat the same verification as Plan 1 Task 6: confirm the `purchases` row, confirm the account provisioned, confirm the invite email arrived and the set-password flow works, all in **live mode** this time.

- [ ] **Step 5: Report done**

Once confirmed, the purchase flow is fully live. No commit needed — this task is entirely external configuration.
