# Stripe Purchase Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor pay €39 once via Stripe Checkout and land in a fully working, pre-provisioned KÖFMAN account without any manual steps.

**Architecture:** Two new Deno edge functions on the `koefman-web` Supabase project (`create-checkout-session`, `stripe-webhook`), a new `purchases` table, a new `/set-password` React page, and a branded Supabase "invite" email template. The webhook is the only place account provisioning happens — it is the single source of truth for "this person paid."

**Tech Stack:** Stripe Node SDK (via esm.sh, Deno target), Supabase JS v2 admin API, existing Deno edge function conventions (CORS headers, service-role client, zod validation) already used by `send-org-document-email`.

## Global Constraints

- Project ref for all Supabase Management API / CLI operations: `stadcjvmhawvdxnxnndp` (koefman-web).
- Stripe price: €39.00 EUR, one-time (not recurring).
- Build and verify entirely in Stripe **test mode** — do not switch to live keys in this plan (that's a deliberate step in the cutover plan, after this is proven working).
- No card data ever touches our code — Stripe Checkout is hosted/redirect-based.
- Edge functions in this repo use: CORS headers constant + OPTIONS preflight handling, `createClient` from `https://esm.sh/@supabase/supabase-js@2`, service-role client for privileged writes, `zod@3.25.76` for request validation. Match these conventions.

---

### Task 1: `purchases` table migration

**Files:**
- Create: `supabase/migrations/20260805120000_create_purchases_table.sql`

**Interfaces:**
- Produces: `public.purchases` table with columns `id uuid pk`, `stripe_session_id text unique not null`, `email text not null`, `amount_cents integer not null`, `user_id uuid` (nullable, set once the account is provisioned), `created_at timestamptz`.

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  email text NOT NULL,
  amount_cents integer NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: this table is only ever read/written by
-- the service-role key inside the stripe-webhook function. Admins can
-- still review purchases via the existing admin-role escape hatch.
CREATE POLICY "Admins can view all purchases" ON public.purchases
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

- [ ] **Step 2: Apply the migration to koefman-web**

Run (from repo root, with `SUPABASE_ACCESS_TOKEN` exported):
```bash
export SUPABASE_ACCESS_TOKEN=<the access token>
npx supabase link --project-ref stadcjvmhawvdxnxnndp
npx supabase db push
```
Expected: migration list includes `20260805120000_create_purchases_table.sql` and `db push` reports it applied with no errors.

- [ ] **Step 3: Verify the table exists**

Run:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/stadcjvmhawvdxnxnndp/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"select column_name, data_type, is_nullable from information_schema.columns where table_name = '"'"'purchases'"'"' order by ordinal_position;"}'
```
Expected: 6 rows matching the columns above.

- [ ] **Step 4: Regenerate TypeScript types**

Run:
```bash
npx supabase gen types typescript --project-id stadcjvmhawvdxnxnndp > src/integrations/supabase/types.ts
```
Expected: `src/integrations/supabase/types.ts` now includes a `purchases` entry under `Tables`. Run `npx tsc --noEmit` — expect no new errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260805120000_create_purchases_table.sql src/integrations/supabase/types.ts
git commit -m "Add purchases table for Stripe one-time purchase tracking"
```

---

### Task 2: `create-checkout-session` edge function

**Files:**
- Create: `supabase/functions/create-checkout-session/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a public HTTP endpoint (`POST /functions/v1/create-checkout-session`, no auth required) that accepts `{ email?: string }` and returns `{ url: string }` — a Stripe-hosted checkout URL to redirect the browser to.

- [ ] **Step 1: Write the function**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { z } from "https://esm.sh/zod@3.25.76";

const RequestSchema = z.object({
  email: z.string().email().optional(),
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appUrl = (Deno.env.get('PUBLIC_APP_URL') || 'https://koefman.de').replace(/\/+$/, '');

    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY');
      return jsonResponse({ error: 'Server configuration error.' }, 500);
    }

    const rawBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: 'Invalid request.' }, 400);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: parsed.data.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: 3900,
            product_data: {
              name: 'KÖFMAN Simple Office — Einmalige Lizenz',
              description: 'Einmalzahlung, lebenslanger Zugang zu KÖFMAN Simple Office.',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/kauf-erfolgreich?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/`,
    });

    if (!session.url) {
      return jsonResponse({ error: 'Could not create checkout session.' }, 500);
    }

    return jsonResponse({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return jsonResponse({ error: 'Unexpected error creating checkout session.' }, 500);
  }
});
```

- [ ] **Step 2: Mark the function as public (no JWT required)**

Append to `supabase/config.toml`:
```toml
[functions.create-checkout-session]
verify_jwt = false
```

This is required because anonymous visitors (not logged in, no Supabase session) trigger this function from the landing page — with the default `verify_jwt = true`, Supabase's gateway would reject every call with 401 before our code even runs.

- [ ] **Step 3: Set the Stripe secret key**

Get your Stripe **test mode** secret key from the Stripe dashboard (Developers → API keys → "Secret key", starts with `sk_test_`). Run:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/stadcjvmhawvdxnxnndp/secrets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name":"STRIPE_SECRET_KEY","value":"sk_test_YOUR_KEY_HERE"}]'
```
Expected: `200` response confirming the secret was set (no need to print the value back).

- [ ] **Step 4: Deploy the function**

```bash
export SUPABASE_ACCESS_TOKEN=<the access token>
npx supabase link --project-ref stadcjvmhawvdxnxnndp
npx supabase functions deploy create-checkout-session
```
Expected: `"message":"Deployed Functions."` with `create-checkout-session` in the list.

- [ ] **Step 5: Verify with a real call**

```bash
curl -s -X POST "https://stadcjvmhawvdxnxnndp.supabase.co/functions/v1/create-checkout-session" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```
Expected: `{"url":"https://checkout.stripe.com/c/pay/..."}`. Open that URL in a browser — expect a real Stripe-hosted checkout page showing "KÖFMAN Simple Office — Einmalige Lizenz" at €39,00.

- [ ] **Step 6: Lint and commit**

```bash
npx eslint supabase/functions/create-checkout-session/index.ts
git add supabase/functions/create-checkout-session/index.ts supabase/config.toml
git commit -m "Add create-checkout-session edge function for Stripe purchase flow"
```

---

### Task 3: `/set-password` page

**Files:**
- Create: `src/pages/SetPassword.tsx`
- Modify: `src/App.tsx:76` (add route, right next to `/pending`)

**Interfaces:**
- Consumes: `supabase` client from `@/integrations/supabase/client` (existing singleton, already configured with `detectSessionInUrl: true` by default — this is what lets the Supabase JS SDK automatically pick up the session from the invite link's URL on page load, no manual token parsing needed).
- Produces: a route at `/set-password` reachable by anyone with a valid, unexpired Supabase invite/recovery link.

- [ ] **Step 1: Write the page**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import BrandMark from '@/components/shared/BrandMark';
import { toast } from 'sonner';

const SetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        setSessionError(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error('Passwort konnte nicht gesetzt werden. Bitte versuchen Sie es erneut.');
      return;
    }
    toast.success('Passwort gesetzt. Willkommen bei KÖFMAN!');
    navigate('/dashboard', { replace: true });
  };

  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <BrandMark variant="wordmark" size="md" align="center" />
          <h1 className="text-xl font-bold text-foreground">Link abgelaufen</h1>
          <p className="text-sm text-muted-foreground">
            Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an oder kontaktieren Sie den Support.
          </p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <BrandMark variant="wordmark" size="md" align="center" />
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-bold text-foreground">Passwort festlegen</h1>
          <p className="text-sm text-muted-foreground">Legen Sie ein Passwort fest, um Ihr KÖFMAN-Konto zu aktivieren.</p>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Neues Passwort"
            className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            autoFocus
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Passwort bestätigen"
            className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Wird gespeichert...' : 'Passwort speichern und loslegen'}
        </button>
      </form>
    </div>
  );
};

export default SetPassword;
```

- [ ] **Step 2: Add the route**

In `src/App.tsx`, find line 76 (`<Route path="/pending" element={<ProtectedRoute><PendingActivation /></ProtectedRoute>} />`) and add directly after it:
```tsx
<Route path="/set-password" element={<SetPassword />} />
```
Add the import near the other page imports (alongside the `PendingActivation` import):
```tsx
import SetPassword from '@/pages/SetPassword';
```

Note this route is intentionally **not** wrapped in `<ProtectedRoute>` — the user isn't fully "logged in" with an active password yet at this point, they're authenticated only via the one-time invite link.

- [ ] **Step 3: Lint and typecheck**

```bash
npx eslint src/pages/SetPassword.tsx src/App.tsx
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SetPassword.tsx src/App.tsx
git commit -m "Add /set-password page for Stripe purchase account activation"
```

---

### Task 4: Brand the "invite" email template + fix the redirect allow-list

**Files:** none in this repo — this is Supabase project configuration, set via the Management API (same pattern as the confirmation email template set up earlier).

**Interfaces:**
- Consumes: nothing from earlier tasks (independent of the code changes).
- Produces: a branded invite email, and a redirect allow-list entry that makes `redirectTo: '.../set-password'` actually work instead of silently falling back to the bare site URL.

- [ ] **Step 1: Add `/set-password` to the redirect allow-list**

The project's `uri_allow_list` is currently empty — Stripe/Supabase docs confirm that with an empty allow-list, only the exact `site_url` is honored as a redirect target, so `inviteUserByEmail`'s `redirectTo` option would otherwise be silently ignored. Run:
```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/stadcjvmhawvdxnxnndp/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uri_allow_list":"https://koefman.de/set-password"}'
```
Expected: response echoes `"uri_allow_list":"https://koefman.de/set-password"`.

- [ ] **Step 2: Write and apply the branded invite template**

Write the HTML to a file first (not inline in the curl command — inline UTF-8 args have corrupted German umlauts earlier in this project) using the same visual style as the confirmation template (black background, KÖFMAN wordmark, white CTA button). Use Node to write the file (avoids shell-encoding issues) directly to `$TEMP` — no extra subdirectory needed:
```bash
node -e "
const fs = require('fs');
const html = \`<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"color-scheme\" content=\"dark light\"><meta name=\"supported-color-schemes\" content=\"dark light\"><style>.btn-cell,.btn-cell[data-ogsc],.btn-cell[data-ogsb]{background-color:#FFFFFF !important;}.btn-link,.btn-link[data-ogsc]{color:#000000 !important;}@media (prefers-color-scheme: dark){.btn-cell{background-color:#FFFFFF !important;}.btn-link{color:#000000 !important;}}</style></head><body style=\"margin:0;padding:0;background-color:#000000;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;color:#FFFFFF;\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color:#000000;min-width:100%;\" bgcolor=\"#000000\"><tr><td align=\"center\" valign=\"top\" style=\"padding:0;background-color:#000000;\" bgcolor=\"#000000\"><table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:600px;width:100%;margin:0 auto;background-color:#000000;\" bgcolor=\"#000000\"><tr><td align=\"center\" valign=\"middle\" style=\"padding:56px 40px 20px 40px;background-color:#000000;\" bgcolor=\"#000000\"><p style=\"color:#FFFFFF;font-size:22px;font-weight:bold;letter-spacing:0.15em;margin:0;font-family:Arial,Helvetica,sans-serif;\">KÖFMAN</p></td></tr><tr><td style=\"padding:12px 40px 0 40px;background-color:#000000;\" bgcolor=\"#000000\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td style=\"border-bottom:2px solid #FFFFFF;font-size:1px;line-height:1px;height:1px;\">&nbsp;</td></tr></table></td></tr><tr><td style=\"padding:40px 40px 6px 40px;background-color:#000000;\" bgcolor=\"#000000\"><h1 style=\"color:#FFFFFF;font-size:26px;font-weight:bold;letter-spacing:0.02em;margin:0;font-family:Arial,Helvetica,sans-serif;\">Willkommen bei KÖFMAN</h1></td></tr><tr><td style=\"padding:16px 40px 36px 40px;background-color:#000000;\" bgcolor=\"#000000\"><p style=\"color:#EEEEEE;font-size:16px;line-height:1.75;margin:0;font-family:Arial,Helvetica,sans-serif;\">Vielen Dank für Ihren Kauf. Legen Sie jetzt ein Passwort fest, um Ihr Konto zu aktivieren und direkt loszulegen.</p></td></tr><tr><td align=\"center\" style=\"padding:0 40px 20px 40px;background-color:#000000;\" bgcolor=\"#000000\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tr><td align=\"center\" bgcolor=\"#FFFFFF\" class=\"btn-cell\" style=\"background-color:#FFFFFF;padding:18px 32px;text-align:center;\"><a href=\"{{ .ConfirmationURL }}\" target=\"_blank\" class=\"btn-link\" style=\"color:#000000;font-size:15px;font-weight:bold;letter-spacing:0.1em;text-decoration:none;text-transform:uppercase;display:inline-block;font-family:Arial,Helvetica,sans-serif;\">→ Passwort festlegen</a></td></tr></table></td></tr><tr><td style=\"padding:0 40px 28px 40px;background-color:#000000;\" bgcolor=\"#000000\"><p style=\"color:#999999;font-size:12px;line-height:1.6;margin:0;font-family:Arial,Helvetica,sans-serif;word-break:break-all;\">Falls der Button nicht angezeigt wird, kopieren Sie diesen Link in Ihren Browser:<br /><a href=\"{{ .ConfirmationURL }}\" style=\"color:#EEEEEE;text-decoration:underline;\">{{ .ConfirmationURL }}</a></p></td></tr><tr><td style=\"padding:20px 40px 40px 40px;background-color:#000000;border-top:1px solid #222222;\" bgcolor=\"#000000\"><p style=\"color:#666666;font-size:11px;letter-spacing:0.05em;margin:0;font-family:Arial,Helvetica,sans-serif;\">KÖFMAN Simple Office · koefman.de</p></td></tr></table></td></tr></table></body></html>\`;
fs.writeFileSync(process.env.TEMP + '/koefman-invite-payload.json', JSON.stringify({
  mailer_subjects_invite: 'Willkommen bei KÖFMAN – Passwort festlegen',
  mailer_templates_invite_content: html
}));
"
```

Then apply it:
```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/stadcjvmhawvdxnxnndp/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@$TEMP/koefman-invite-payload.json"
```
Expected: response includes `"mailer_subjects_invite":"Willkommen bei KÖFMAN – Passwort festlegen"` and `mailer_templates_custom_contents.MAILER_TEMPLATES_INVITE_CONTENT: true`.

- [ ] **Step 3: No commit needed** — this task is entirely Supabase project configuration, nothing in this repo changes.

---

### Task 5: `stripe-webhook` edge function (provisioning)

**Files:**
- Create: `supabase/functions/stripe-webhook/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Consumes: `purchases` table (Task 1), Stripe SDK pattern (Task 2).
- Produces: a public HTTP endpoint that Stripe calls directly. On `checkout.session.completed`: creates the purchase record, invites the user, and pre-creates their `organizations` + `organization_memberships` + `business_settings` rows using the exact same shape as `src/pages/Onboarding.tsx:220-236` (organization owned by the new user, membership role `'owner'`, empty business settings ready to fill in).

- [ ] **Step 1: Write the function**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function provisionAccount(
  supabaseAdmin: SupabaseClient,
  email: string,
  appUrl: string,
): Promise<void> {
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/set-password`,
  });
  if (inviteError || !inviteData?.user) {
    throw new Error(`Failed to invite user: ${inviteError?.message}`);
  }

  const userId = inviteData.user.id;
  const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mein-geschaeft';

  const { data: newOrg, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({ name: 'Mein Geschäft', slug, owner_user_id: userId })
    .select('id')
    .single();
  if (orgError || !newOrg) {
    throw new Error(`Failed to create organization: ${orgError?.message}`);
  }

  const { error: memberError } = await supabaseAdmin
    .from('organization_memberships')
    .insert({ organization_id: newOrg.id, user_id: userId, role: 'owner' });
  if (memberError) {
    throw new Error(`Failed to create membership: ${memberError.message}`);
  }

  const { error: settingsError } = await supabaseAdmin
    .from('business_settings')
    .insert({ user_id: userId, business_name: '' });
  if (settingsError) {
    throw new Error(`Failed to create business settings: ${settingsError.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appUrl = (Deno.env.get('PUBLIC_APP_URL') || 'https://koefman.de').replace(/\/+$/, '');

    if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables for stripe-webhook');
      return jsonResponse({ error: 'Server configuration error.' }, 500);
    }

    const signature = req.headers.get('Stripe-Signature');
    if (!signature) {
      return jsonResponse({ error: 'Missing Stripe-Signature header.' }, 400);
    }

    const rawBody = await req.text();

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Deno's crypto is async-only, so this must use constructEventAsync,
    // not the sync constructEvent used in Node environments.
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return jsonResponse({ error: 'Invalid signature.' }, 400);
    }

    if (event.type !== 'checkout.session.completed') {
      // Acknowledge and ignore other event types.
      return jsonResponse({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      console.error('Checkout session completed with no email:', session.id);
      return jsonResponse({ error: 'No email on session.' }, 400);
    }

    const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Idempotency: Stripe may redeliver the same event. If we've already
    // recorded this session, skip provisioning again.
    const { data: existing } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();
    if (existing) {
      return jsonResponse({ received: true, alreadyProcessed: true });
    }

    await provisionAccount(supabaseAdmin, email, appUrl);

    const { error: purchaseInsertError } = await supabaseAdmin.from('purchases').insert({
      stripe_session_id: session.id,
      email,
      amount_cents: session.amount_total ?? 3900,
    });
    if (purchaseInsertError) {
      // Provisioning already succeeded — log but don't fail the webhook,
      // Stripe would otherwise retry and re-invite the same email.
      console.error('Failed to record purchase (provisioning already succeeded):', purchaseInsertError);
    }

    return jsonResponse({ received: true });
  } catch (err) {
    console.error('stripe-webhook error:', err);
    return jsonResponse({ error: 'Unexpected error processing webhook.' }, 500);
  }
});
```

- [ ] **Step 2: Mark the function as public (no JWT required)**

Append to `supabase/config.toml`:
```toml
[functions.stripe-webhook]
verify_jwt = false
```

Required because Stripe's servers call this directly with no Supabase JWT — authenticity is verified via the `Stripe-Signature` header inside the function instead.

- [ ] **Step 3: Deploy the function**

```bash
npx supabase functions deploy stripe-webhook
```
Expected: `"message":"Deployed Functions."` with `stripe-webhook` in the list.

- [ ] **Step 4: Register the webhook in Stripe and set the webhook secret**

In the Stripe dashboard (test mode): Developers → Webhooks → Add endpoint. URL: `https://stadcjvmhawvdxnxnndp.supabase.co/functions/v1/stripe-webhook`. Event: `checkout.session.completed`. After creating it, copy the "Signing secret" (starts with `whsec_`) and set it:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/stadcjvmhawvdxnxnndp/secrets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name":"STRIPE_WEBHOOK_SECRET","value":"whsec_YOUR_SECRET_HERE"}]'
```

- [ ] **Step 5: Lint and commit**

```bash
npx eslint supabase/functions/stripe-webhook/index.ts
git add supabase/functions/stripe-webhook/index.ts supabase/config.toml
git commit -m "Add stripe-webhook edge function for automatic account provisioning"
```

---

### Task 6: Real end-to-end verification (Stripe test mode)

**Files:** none — this is a manual verification pass, not a code change. This task is not "done" by writing code; it's done by watching the real flow work.

- [ ] **Step 1: Trigger a real test purchase**

Call `create-checkout-session` with your own test email (as in Task 2 Step 5), open the returned URL, and pay using Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.

- [ ] **Step 2: Confirm the webhook fired**

```bash
curl -s "https://api.supabase.com/v1/projects/stadcjvmhawvdxnxnndp/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"select * from public.purchases order by created_at desc limit 1;"}'
```
Expected: one row with your test email and `amount_cents: 3900`.

- [ ] **Step 3: Confirm the account was provisioned**

```bash
curl -s "https://api.supabase.com/v1/projects/stadcjvmhawvdxnxnndp/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"select u.email, o.name, om.role from auth.users u join public.organization_memberships om on om.user_id = u.id join public.organizations o on o.id = om.organization_id where u.email = '"'"'YOUR_TEST_EMAIL'"'"';"}'
```
Expected: one row showing the org and `role: owner`.

- [ ] **Step 4: Confirm the invite email actually arrived and works**

Check the test email's inbox — expect the branded "Willkommen bei KÖFMAN" email from Task 4. Click the button, confirm it lands on `/set-password` (not redirected to the bare homepage — this is exactly what the allow-list fix in Task 4 Step 1 prevents), set a password, confirm you land on `/dashboard` logged in.

- [ ] **Step 5: Report results**

If any step fails, stop and diagnose before proceeding to the landing-page plan — this flow is the foundation the rest depends on.
