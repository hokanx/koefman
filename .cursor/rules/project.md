# KÖFMAN — project context for Cursor's AI

## What this is
KÖFMAN Simple Office — a mobile-first office management web app for small
service businesses (car garages, cleaning firms). Exported from Lovable.
Multilingual: German (default), Arabic (RTL), English. Simple, beginner-
friendly UI; low cognitive load; large tap targets; card-based lists over
crowded tables on mobile.

## Stack (current app, this repo)
- Vite + React + TypeScript, shadcn/ui + Tailwind
- Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js`
- Client env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  (read in `src/integrations/supabase/client.ts`)
- `.env` holds secrets, is git-ignored, never committed
- Run: `npm install && npm run dev` (Vite dev server on localhost)

## Core features (MVP)
Customer management · Offers/quotations · Invoices · Dashboard · Settings.
Closed loop: offer (draft → sent → signed → convert to invoice) → invoice
(open → paid/overdue/cancelled).

## Important: two documents, two purposes
- `docs/SPEC.md` (or repo root) describes a **future native iOS rebuild**
  (Expo/React Native) — that is a separate, later project, NOT this Vite app.
- `cursor-setup-guide.md` is the cross-device workflow for **this** Vite/React/
  Supabase codebase.
- Do not conflate the two: don't pull in Expo/React Native patterns or the iOS
  rebuild's data model into this Vite app unless explicitly asked to start
  that rebuild.

## Working agreement
- Only build the intended MVP — no speculative features, no scope creep.
- Work one fix at a time; propose changes as diffs for review before applying.
- Never commit `.env` or any secret. Confirm `.gitignore` still excludes it.
- Test each change live in the running dev server before considering it done.
- Golden rule for the human: pull before starting work, push after finishing.
