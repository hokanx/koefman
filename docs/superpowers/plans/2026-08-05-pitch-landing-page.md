# Pitch Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new one-page pitch (explain KÖFMAN, show real screenshots, 5 niche case studies, €39 pricing, buy button) on a preview route, without touching the current live homepage.

**Architecture:** A new page (`src/pages/PitchLanding.tsx`) composed of focused section components under `src/components/pitch-landing/`, reusing the existing `FadeSection`/`BrandMark`/`LegalFooter` components and the scroll-snap section pattern already used by `LandingPage.tsx`. Wired to a new `/pitch-preview` route — `/` is untouched by this plan.

**Tech Stack:** React, Tailwind (existing design tokens — pure black/white premium theme), `supabase.functions.invoke` to call `create-checkout-session` from Plan 1.

## Global Constraints

- German only, no i18n needed for this page.
- Route: `/pitch-preview` (not `/`) — the cutover to `/` happens in the separate removal/cutover plan, only after this is reviewed and approved.
- Requires Plan 1 (`2026-08-05-stripe-purchase-flow.md`) to be complete and verified — the buy button calls `create-checkout-session`, which must already exist and work.
- Case studies map to the app's real `business_category` values (`src/pages/Settings.tsx:314-319`): `garage` → Kfz/Werkstatt, `cleaning` → Gebäudereinigung, `consulting` → Beratung, `service` → Kundenservice/Termine, `web` → Website/Domain/Betreuung.
- Case studies are framed as illustrative "So hilft KÖFMAN [Branche]" scenarios — never as quotes attributed to invented named customers.

---

### Task 1: Case studies component

**Files:**
- Create: `src/components/pitch-landing/CaseStudies.tsx`

**Interfaces:**
- Produces: `CaseStudies` component (no props), rendered by `PitchLanding.tsx` (Task 4).

- [ ] **Step 1: Write the component with real copy**

```tsx
import FadeSection from '@/components/ui/FadeSection';

interface CaseStudy {
  niche: string;
  painPoint: string;
  solution: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    niche: 'Kfz / Werkstatt',
    painPoint: 'Angebote und Aufträge verschwinden im Papierkram — Kunden warten tagelang auf ein Angebot.',
    solution: 'Digitale Angebote mit Fahrzeugdaten (Kennzeichen, Marke, Modell), Live-Preisberechnung und digitaler Unterschrift direkt vor Ort.',
  },
  {
    niche: 'Gebäudereinigung',
    painPoint: 'Wiederkehrende Aufträge und Sonderleistungen werden manuell in Excel oder auf Zetteln verwaltet.',
    solution: 'Kundenverwaltung mit Reinigungsintervall und Objektgröße, alle Rechnungen und Angebote an einem Ort.',
  },
  {
    niche: 'Beratung',
    painPoint: 'Angebote für Beratungsleistungen dauern zu lange und wirken unprofessionell.',
    solution: 'Gebrandete Angebote in Minuten erstellt, mit Ihrem Logo und Ihren Farben — wirkt wie von einer Agentur.',
  },
  {
    niche: 'Kundenservice / Termine',
    painPoint: 'Der Überblick über offene Anfragen und Rechnungen geht im Alltagsgeschäft verloren.',
    solution: 'Dashboard mit allen offenen, bezahlten und überfälligen Rechnungen auf einen Blick.',
  },
  {
    niche: 'Website / Domain / Betreuung',
    painPoint: 'Laufende Betreuungsverträge und einmalige Projekte brauchen unterschiedliche Abrechnungslogik.',
    solution: 'Rechnungen und Angebote flexibel für Einmalprojekte und laufende Betreuung — inklusive digitaler Unterschrift für Verträge.',
  },
];

const CaseStudies = () => (
  <section className="px-6 py-24 sm:py-32">
    <div className="mx-auto max-w-5xl">
      <FadeSection className="text-center mb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold uppercase tracking-[0.08em] text-foreground">
          Für welches Geschäft auch immer
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          So hilft KÖFMAN in Ihrer Branche.
        </p>
      </FadeSection>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CASE_STUDIES.map((cs, i) => (
          <FadeSection key={cs.niche} delay={i * 100} className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold uppercase tracking-[0.05em] text-foreground mb-3">
              {cs.niche}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              <span className="font-medium text-foreground">Problem:</span> {cs.painPoint}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Lösung:</span> {cs.solution}
            </p>
          </FadeSection>
        ))}
      </div>
    </div>
  </section>
);

export default CaseStudies;
```

- [ ] **Step 2: Lint and typecheck**

```bash
npx eslint src/components/pitch-landing/CaseStudies.tsx
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/pitch-landing/CaseStudies.tsx
git commit -m "Add case studies section for pitch landing page"
```

---

### Task 2: Feature walkthrough component (with real app screenshots)

**Files:**
- Create: `src/components/pitch-landing/FeatureWalkthrough.tsx`
- Create: screenshot image files under `src/assets/pitch-landing/` (captured in Step 1, referenced in Step 2)

**Interfaces:**
- Produces: `FeatureWalkthrough` component (no props), rendered by `PitchLanding.tsx` (Task 4).

- [ ] **Step 1: Capture real screenshots of the running app**

Using the chrome-devtools MCP tools (`new_page`, `navigate_page`, `take_screenshot`) against a logged-in local dev session (`npm run dev`, log in with a real test account), capture and save these exact 4 screenshots to `src/assets/pitch-landing/`:
- `dashboard.png` — the `/dashboard` page
- `offer-editor.png` — `/offers/new` with at least one line item filled in so totals are visible
- `signature.png` — a `/offer/view/:token` public page showing the signature pad (use a real offer's public link)
- `branded-pdf.png` — an exported offer/invoice PDF, or a screenshot of `/settings` showing the branding/logo section if a PDF screenshot isn't practical

Crop/resize is not required — the component below constrains display size via CSS.

- [ ] **Step 2: Write the component**

```tsx
import FadeSection from '@/components/ui/FadeSection';
import dashboardImg from '@/assets/pitch-landing/dashboard.png';
import offerEditorImg from '@/assets/pitch-landing/offer-editor.png';
import signatureImg from '@/assets/pitch-landing/signature.png';
import brandedPdfImg from '@/assets/pitch-landing/branded-pdf.png';

interface Feature {
  title: string;
  description: string;
  image: string;
}

const FEATURES: Feature[] = [
  {
    title: 'Kunden & Angebote',
    description: 'Kundendaten, Angebote mit Live-Preisberechnung und Status auf einen Blick.',
    image: offerEditorImg,
  },
  {
    title: 'Digitale Unterschrift',
    description: 'Kunden unterschreiben direkt am Handy oder Tablet — kein Papier, kein Scannen.',
    image: signatureImg,
  },
  {
    title: 'Gebrandete PDFs',
    description: 'Angebote und Rechnungen mit Ihrem Logo, Ihren Farben und Ihren Zahlungsbedingungen.',
    image: brandedPdfImg,
  },
  {
    title: 'Dashboard',
    description: 'Offene, bezahlte und überfällige Rechnungen — alles auf einer Seite.',
    image: dashboardImg,
  },
];

const FeatureWalkthrough = () => (
  <section className="px-6 py-24 sm:py-32 bg-card/30">
    <div className="mx-auto max-w-5xl">
      <FadeSection className="text-center mb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold uppercase tracking-[0.08em] text-foreground">
          Was KÖFMAN kann
        </h2>
      </FadeSection>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
        {FEATURES.map((f, i) => (
          <FadeSection key={f.title} delay={i * 100} className="space-y-3">
            <img
              src={f.image}
              alt={f.title}
              className="w-full rounded-xl border border-border object-cover"
            />
            <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.description}</p>
          </FadeSection>
        ))}
      </div>
    </div>
  </section>
);

export default FeatureWalkthrough;
```

- [ ] **Step 3: Lint and typecheck**

```bash
npx eslint src/components/pitch-landing/FeatureWalkthrough.tsx
npx tsc --noEmit
```
Expected: no errors. If the screenshot files aren't present yet, `tsc`/the Vite build will fail on the image imports — Step 1 must be done first.

- [ ] **Step 4: Commit**

```bash
git add src/components/pitch-landing/FeatureWalkthrough.tsx src/assets/pitch-landing/
git commit -m "Add feature walkthrough section with real app screenshots"
```

---

### Task 3: Pricing section + checkout integration

**Files:**
- Create: `src/components/pitch-landing/PricingSection.tsx`

**Interfaces:**
- Consumes: `create-checkout-session` edge function (Plan 1, Task 2) via `supabase.functions.invoke`.
- Produces: `PricingSection` component (no props) with the buy button that starts the real Stripe flow.

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react';
import FadeSection from '@/components/ui/FadeSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PricingSection = () => {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: {} });
    setLoading(false);
    if (error || !data?.url) {
      toast.error('Kauf konnte nicht gestartet werden. Bitte versuchen Sie es erneut.');
      return;
    }
    window.location.href = data.url;
  };

  return (
    <section className="px-6 py-24 sm:py-32">
      <FadeSection className="mx-auto max-w-md rounded-2xl border border-foreground bg-card p-10 text-center space-y-6">
        <h2 className="text-xl font-semibold uppercase tracking-[0.05em] text-foreground">
          Einmalzahlung. Kein Abo.
        </h2>
        <p className="text-5xl font-bold text-foreground">39 €</p>
        <p className="text-sm text-muted-foreground">
          Lebenslanger Zugang zu KÖFMAN Simple Office — Kunden, Angebote, Rechnungen, digitale Unterschrift, gebrandete PDFs, Dashboard.
        </p>
        <button
          onClick={handleBuy}
          disabled={loading}
          className="w-full border border-foreground px-8 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-50"
        >
          {loading ? 'Wird geladen...' : '[ Jetzt für 39 € freischalten ]'}
        </button>
      </FadeSection>
    </section>
  );
};

export default PricingSection;
```

- [ ] **Step 2: Lint and typecheck**

```bash
npx eslint src/components/pitch-landing/PricingSection.tsx
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/pitch-landing/PricingSection.tsx
git commit -m "Add pricing section with Stripe checkout integration"
```

---

### Task 4: `PitchLanding` page (hero, problem, composition)

**Files:**
- Create: `src/pages/PitchLanding.tsx`
- Modify: `src/App.tsx` (add route)

**Interfaces:**
- Consumes: `CaseStudies` (Task 1), `FeatureWalkthrough` (Task 2), `PricingSection` (Task 3), `useAuth` from `@/contexts/AuthContext`, `BrandMark`, `LegalFooter`, `FadeSection`.
- Produces: the full page at `/pitch-preview`.

- [ ] **Step 1: Write the page**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BrandMark from '@/components/shared/BrandMark';
import LegalFooter from '@/components/shared/LegalFooter';
import FadeSection from '@/components/ui/FadeSection';
import FeatureWalkthrough from '@/components/pitch-landing/FeatureWalkthrough';
import CaseStudies from '@/components/pitch-landing/CaseStudies';
import PricingSection from '@/components/pitch-landing/PricingSection';

const PitchLanding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandMark variant="wordmark" size="md" />
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-muted-foreground tracking-[0.1em] uppercase hover:text-foreground transition-colors"
          >
            Anmelden
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-14">
        <div className="w-full max-w-2xl text-center space-y-6">
          <FadeSection>
            <h1 className="text-2xl sm:text-4xl font-semibold uppercase tracking-[0.06em] leading-[1.3] text-foreground">
              Angebote, Rechnungen und Unterschriften — an einem Ort.
            </h1>
          </FadeSection>
          <FadeSection delay={200}>
            <p className="text-base sm:text-lg text-muted-foreground">
              KÖFMAN ist die einfache Büroverwaltung für Handwerker, Werkstätten und Dienstleister.
              Kein Papierkram, keine Excel-Tabellen — gebrandete Angebote und Rechnungen in Minuten.
            </p>
          </FadeSection>
          <FadeSection delay={400} className="pt-6">
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="border border-foreground px-8 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase"
            >
              [ Jetzt für 39 € freischalten ]
            </button>
          </FadeSection>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="px-6 py-24 sm:py-32">
        <FadeSection className="mx-auto max-w-2xl text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold uppercase tracking-[0.06em] text-foreground">
            Angebote per Hand. Rechnungen in Excel. Unterschriften auf Papier.
          </h2>
          <p className="text-base text-muted-foreground">
            Jede verlorene Minute ist verlorenes Geld — und jeder Kunde, der zu lange auf ein Angebot wartet, geht zur Konkurrenz.
          </p>
        </FadeSection>
      </section>

      <FeatureWalkthrough />
      <CaseStudies />
      <div id="pricing">
        <PricingSection />
      </div>

      {/* FOOTER */}
      <footer className="py-16 text-center flex flex-col items-center justify-center gap-6">
        <BrandMark variant="wordmark" size="sm" align="center" />
        <LegalFooter />
      </footer>
    </div>
  );
};

export default PitchLanding;
```

- [ ] **Step 2: Add the route**

In `src/App.tsx`, add near the other public routes (alongside `/landing`):
```tsx
<Route path="/pitch-preview" element={<PitchLanding />} />
```
Add the import alongside the other page imports:
```tsx
import PitchLanding from '@/pages/PitchLanding';
```

- [ ] **Step 3: Lint and typecheck**

```bash
npx eslint src/pages/PitchLanding.tsx src/App.tsx
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PitchLanding.tsx src/App.tsx
git commit -m "Add pitch landing page at /pitch-preview"
```

---

### Task 5: Manual review on the live preview route

**Files:** none — verification only.

- [ ] **Step 1: Push and publish**

```bash
git push origin main
```
Then publish via Lovable (same as every other app-code change this session — code changes need a Lovable Publish to go live, unlike Supabase config changes).

- [ ] **Step 2: Review live at `https://koefman.de/pitch-preview`**

Check: all sections render, screenshots load, case studies show correct pain-point/solution copy, "Anmelden" link goes to `/login`, the buy button opens a real Stripe checkout page.

- [ ] **Step 3: Report back for review**

This page is not linked from anywhere yet (`/` still shows the current homepage) — safe to leave live at this URL until the cutover plan runs. Get explicit approval on content/design before proceeding to the removal-and-cutover plan.
