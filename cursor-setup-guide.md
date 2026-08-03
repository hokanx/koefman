# Complete Guide — Cursor + Cross-Device-Safe Setup (KÖFMAN)

Your goal: work on the app in Cursor, with everything saved and safe even if you
switch computers. This guide takes you from zero.

---

## The mental model (read this first)

Four things keep your work safe and portable. Understand these and the rest is
mechanical:

1. **GitHub = the home of your code.** Not your laptop. Every device holds a
   *copy*. You "save to the cloud" by committing + pushing to GitHub.
   `hokanx/koefman` is already there and connected.
2. **Supabase = your backend, already in the cloud.** Same database and logins
   from any device automatically. Nothing to move.
3. **Password manager = your secret keys.** Your `.env` (Supabase keys) is
   deliberately kept OUT of GitHub. Store those keys in a password manager so you
   can recreate `.env` on any device.
4. **Cursor account = your editor settings.** Sign in and Cursor syncs your
   settings/preferences across devices.

**The golden rule:** *Pull before you start, push when you stop.* If it's on
GitHub, it's safe.

---

## Part 1 — Accounts to set up once (work on every device)

- **GitHub** — you have it (`hokanx`), repo already connected. ✔
- **Cursor account** — you'll create it at first launch (below).
- **Supabase** — confirm you can log in at supabase.com and see the KÖFMAN
  project. Grab the Project URL + publishable key (Settings → API Keys).
- **A password manager** — 1Password, Bitwarden, or the one built into Apple/
  Google. You'll store your Supabase keys here so any device can rebuild `.env`.

---

## Part 2 — First-device setup

1. **Install Node.js** (LTS) from nodejs.org — the app needs it to run.
2. **Install Cursor** from cursor.com. Open it.
3. **Sign in** (Google, GitHub, or email). This turns on AI features and syncs
   your Cursor settings across devices. Use the SAME account on every device.
4. **Connect GitHub + clone the repo, inside Cursor:**
   - Open the Command Palette (Cmd/Ctrl+Shift+P) → "Git: Clone" (or use the
     welcome screen's "Clone repo").
   - Paste `https://github.com/hokanx/koefman.git`, sign into GitHub when asked,
     pick a folder. Cursor opens the project.
5. **Create your `.env`** in the project root (New File → `.env`):
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```
   **Now paste those two values into your password manager**, labelled "KÖFMAN
   Supabase." This is what makes `.env` recreatable on other devices.
6. **Confirm `.env` is git-ignored:** open `.gitignore`, make sure a line reads
   `.env`. If not, add it. (This keeps secrets out of GitHub — on purpose.)
7. **Run it.** Open Cursor's terminal (View → Terminal) — or just ask the AI to
   do it — and run:
   ```
   npm install
   npm run dev
   ```
   Open the `localhost` link it prints. Your app loads with your real data.
8. **Prove the safety loop works:** make a tiny edit, then commit + push (Part 3).
   Refresh the repo on github.com and confirm your change is there.

---

## Part 3 — Your daily safe workflow

Every working session, same rhythm:

1. **Pull first** — Cursor's Source Control panel (left sidebar) → "Pull," or
   `git pull`. This grabs anything from another device.
2. **Work** — edit, or let Cursor's AI make changes (Part 5).
3. **Review** — check the changed files in the Source Control panel (diffs).
4. **Commit** — write a short message ("fix invoice public_token default") and
   commit.
5. **Push** — click "Push." Now it's safe on GitHub.

For anything bigger than a small fix, work on a **branch** (Source Control →
create branch) so `main` always stays working. Commit small and often — each
commit is a save point you can roll back to.

---

## Part 4 — Switching to another device (the payoff)

1. Install **Node.js** and **Cursor**; sign into Cursor with the same account
   (your settings sync down).
2. **Clone** `hokanx/koefman` (first time on that device) — or **Pull** if it's
   already cloned.
3. **Recreate `.env`** from your password manager (it isn't in GitHub by design).
4. `npm install`, then `npm run dev`.
5. Work as usual.

**Two rules that prevent all trouble:**
- Always **pull before** you start on a device.
- Always **push after** you finish.
- Never edit the same repo on two devices without pushing/pulling in between (that
  causes merge conflicts).

---

## Part 5 — Using Cursor's AI to fix the app

- **Chat** (Cmd/Ctrl+L): ask questions about the code.
- **Agent / Composer** (Cmd/Ctrl+I): let the AI edit files and run commands. It
  proposes changes as diffs — **review and accept** them; nothing lands without
  your ok.
- **Give it the docs:** put `AUDIT.md` and `SPEC.md` in a `docs/` folder in the
  repo so the AI has the intended-app definition to work from.
- **Persistent project context that travels with you:** create a file
  `.cursor/rules/project.md` (Cursor Rules). Put a short description of the app,
  the stack, and "only build the intended MVP" guidance there. Because it's
  committed to the repo, every device and every AI session automatically gets it.
- **Work one fix at a time**, test it live in the running app, then commit.

### First two prompts to give Cursor's Agent

Get it running:
> This is my existing app exported from Lovable (Vite + React + Supabase). Read
> the README and `docs/SPEC.md` so you understand it. Then tell me exactly what
> goes in `.env`, run `npm install`, and start the dev server. Don't change app
> code yet — just get it running.

First real fix:
> Public document links (offers/invoices shared for signing) break due to the
> `invoices.public_token` default. Investigate how `public_token` is generated
> and defaulted in the schema and code, explain the cause, and propose a fix. On
> my approval, apply it on a new branch, commit, and tell me how to test it live.

---

## Part 6 — What is / isn't saved to GitHub

- **Saved (safe across devices):** all your code, `docs/`, `.cursor/rules`, commit
  history.
- **NOT saved (on purpose):** `.env` (secrets → password manager), `node_modules`
  (regenerated by `npm install`). This is correct and normal.

---

## Part 7 — Later: going live on koefman.de

When the app is fixed, connect the GitHub repo to Vercel/Netlify/Cloudflare Pages
(build `npm run build`, output `dist`), add the two `VITE_` env vars there, add an
SPA fallback, and point koefman.de's DNS at it. Deploys straight from GitHub — so
this is device-independent too.

---

## One-page summary

Install Node + Cursor → sign in → clone `hokanx/koefman` in Cursor → make `.env`
(store keys in password manager) → `npm install` + `npm run dev` → fix in the AI
Agent one step at a time → **pull before, push after**, every session. GitHub +
Supabase + password manager = your work is safe on any device.
