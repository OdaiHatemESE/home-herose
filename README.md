# أبطال البيت — Home Heroes

> تحدّي أبطال البيت — معًا نحو المسؤولية والنجاح والتميّز

Home Heroes is a multi-family app for household responsibilities, skill growth and rewards.
Parents set up tasks, scoring rules, levels and rewards. Each child has a private login
without an email address. Points are calculated and approved on the server, and every week
is closed into a snapshot that can be audited later.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn-style Radix components · TanStack Query ·
React Hook Form + Zod · Recharts · Supabase (Postgres, Auth, RLS, Edge Functions) · PWA · GitHub Pages.
Arabic (RTL) is the default; English is built in.

---

## نظرة سريعة (بالعربي)

| الخطوة | ماذا تفعل |
|---|---|
| ١. Supabase | أنشئ مشروعاً، ثم طبّق ملفات `supabase/migrations` وانشر الدوال الثلاث |
| ٢. الأسرار | ضع `CHILD_CREDENTIAL_PEPPER` في أسرار الدوال (لا يوضع أبداً في الواجهة) |
| ٣. GitHub | أضف المتغيرين `VITE_SUPABASE_URL` و `VITE_SUPABASE_PUBLISHABLE_KEY`، واجعل مصدر Pages هو "GitHub Actions" |
| ٤. النشر | ادفع إلى `main` ← يتم الفحص والاختبار والنشر تلقائياً |
| تجربة محلية | `npm run demo` — عائلة تجريبية كاملة بدون أي حساب سحابي |

---

## Phone & tablet app

The Expo app in [`mobile/`](mobile/README.md) uses the same backend and business rules as the
website. Its web preview is published with the website at `https://<user>.github.io/<repo>/app/`,
where it can be tested before native Android/iOS builds are made.

## Contents

- [Features](#features)
- [Project structure](#project-structure)
- [Quick start — local demo](#quick-start--local-demo-no-cloud-account)
- [Supabase setup](#supabase-setup)
- [Edge Functions](#edge-functions)
- [GitHub Pages deployment](#github-pages-deployment)
- [Testing](#testing)
- [Security model](#security-model)
- [Scoring rules](#scoring-rules)
- [Troubleshooting](#troubleshooting)

## Features

- **Families and roles.** An owner and co-parents, expiring invitations that can be revoked,
  and full isolation between families.
- **Child accounts.** Children sign in with a family code, a username and a secret phrase
  (at least 6 characters). Accounts are created on the server, and login attempts are rate-limited.
- **Tasks.** Bilingual titles, categories, icons and colours, and assignment to one or several
  children. Tasks can repeat daily, weekly, on chosen weekdays, occasionally or once. Each task
  can have a checklist, an age range, an auto-approve option with random sampling, and a date
  from which changes take effect. School tasks can skip weekends and holidays.
- **Scoring engine.** All scoring runs on the server in Postgres functions. The point-event
  ledger cannot be edited; corrections are recorded as reversals. Reminders are logged, and the
  daily initiative bonus is capped. The weekly percentage is approved points ÷ maximum eligible
  points, and unscheduled tasks are left out of that maximum.
- **Initiatives.** A child proposes an initiative and a parent approves it. Approved
  initiatives show as golden stars.
- **Levels.** Gold, Silver, Bronze and Growing, with editable thresholds, labels, money
  and privileges. Several children can reach Gold in the same week. A parent confirms the
  results before the week closes into a stable snapshot.
- **Rewards.** A catalogue with a minimum level, age suitability and weekly or monthly
  limits. Each reward is tracked from earned to fulfilled, and money rewards are marked paid
  or unpaid (a manual ledger).
- **Skills & Growth.** A five-step descriptive scale, criteria, targets, observations and
  progress charts.
- **Notes.** Child reflections and parent observations. Notes can be private to parents
  (enforced by RLS) or visible to the child, and can be linked to a task, a skill or a week.
- **Family values.** Kindness can be recognised, and incidents can be recorded with repair
  actions. There are no automatic penalties and no rankings between siblings.
- **Dashboards.** The parent dashboard shows the day, the review queues, weekly progress,
  independence trends and filters. The child dashboard is playful, with a simplified view for
  young children.
- **Reports.** Daily, weekly, child, category, independence, initiative, skills, rewards and
  review reports, all exportable as CSV. The A4 printables are the weekly challenge sheet,
  certificates, the family poster and the level guide, printed or saved to PDF from the browser.
- **Privacy tools.** Data export, retention settings, removing members or children, and
  deleting the whole family.
- **General.** Installable as a PWA, light and dark themes, self-hosted fonts and no
  third-party requests.

## Project structure

```
src/
  api/            typed data-access layer (TanStack Query hooks → Supabase)
  auth/           AuthProvider + route guards (parent / child / guest)
  components/     ui/ (design system), brand/, layout/, parent/, child/
  i18n/           ar.ts (default), en.ts
  lib/            supabase client, scoring helpers, dates, csv, theme, generated DB types
  pages/          public/, onboarding/, parent/, child/, print/
supabase/
  migrations/     schema → security/RLS → scoring engine → family management
  functions/      child-login, manage-child, manage-family (+ _shared)
  tests/          PGlite-backed tests: RLS isolation, scoring, credentials
e2e/              Playwright: full acceptance scenario + RTL/mobile layout
scripts/
  qa-stack/       Docker-free Supabase-compatible server (real migrations in PGlite) for demo & E2E
  demo.mjs        local demo launcher
.github/workflows deploy.yml (CI + Pages) · supabase.yml (manual backend deploy)
```

## Quick start — local demo (no cloud account)

Requires Node 22+.

```bash
npm ci
npm run demo
```

Open <http://localhost:5173>. The demo runs the real migrations in an in-memory Postgres (PGlite)
and seeds a sample family. The data is reset every time the demo starts, and a banner marks
demo mode.

| Who | Sign in |
|---|---|
| Parents | `father@example.com` / `password123`, or `mother@example.com` |
| Children | the family code printed in the terminal, the username `tuqa`, `retal`, `hatem` or `obai`, and the secret `<username>-star-7` |

## Supabase setup

### 1. Create the project

Create a project at [supabase.com](https://supabase.com). Note the **Project URL**, the
**publishable key** (`sb_publishable_…`, or the legacy `anon` key) and the database password.

### 2. Apply the database migrations

You can use the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

You can also run the GitHub workflow **Deploy Supabase backend** (see below), or paste the
four files in `supabase/migrations/` into the SQL editor in order.

### 3. Configure Auth (Dashboard → Authentication)

- **URL Configuration.** Set **Site URL** to `https://<user>.github.io/<repo>/` and add the
  redirect URL `https://<user>.github.io/<repo>/**`. For local development, also add
  `http://localhost:5173/**`.
- **Email confirmations.** Keep these on for production.
- **SMTP.** Supabase's built-in email sender has a low limit. Set up custom SMTP before you
  invite real families.

### 4. Local frontend against your project

```bash
cp .env.example .env.local     # fill VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

> ⚠️ `VITE_*` values are compiled into the public bundle. Use **only** the publishable key here.
> The app refuses to start if it is given a secret or `service_role` key, and CI refuses to deploy one.

## Edge Functions

| Function | Purpose |
|---|---|
| `child-login` | Exchanges the family code, username and secret for a session. Rate-limited per IP and per account, with generic errors so usernames cannot be guessed. |
| `manage-child` | Creates a child's account, resets their secret, revokes their sessions, and deactivates or deletes the child. Callers must be parents in that family. |
| `manage-family` | Deletes the whole family. Only the owner can do this. |

Each function checks the caller's family membership and role itself. A valid JWT alone is not
trusted, so the gateway check (`verify_jwt`) is turned off in `supabase/config.toml`.

**Secrets** (template in `supabase/functions/.env.example`):

| Secret | Required | Notes |
|---|---|---|
| `CHILD_CREDENTIAL_PEPPER` | ✅ | Generate with `openssl rand -base64 48`. **Never change it once children exist**, or every child secret has to be reset. |
| `ALLOWED_ORIGIN` | recommended | e.g. `https://<user>.github.io` (CORS). Defaults to `*`. |
| `CHILD_EMAIL_DOMAIN` | optional | Domain for the internal child auth emails. Default `children.home-heroes.invalid`. |

`SUPABASE_URL` and the service keys are injected by Supabase automatically.

```bash
cp supabase/functions/.env.example supabase/functions/.env   # edit values
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy child-login
npx supabase functions deploy manage-child
npx supabase functions deploy manage-family
```

### Deploying the backend from GitHub (optional)

`.github/workflows/supabase.yml` only runs when started by hand (**Actions → Deploy Supabase
backend → Run workflow**), so a push can never change the production database. It needs these
repository **secrets**: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`
and `CHILD_CREDENTIAL_PEPPER`. It also reads an optional variable, `ALLOWED_ORIGIN`.

## GitHub Pages deployment

1. Push the repository to GitHub, with `main` as the default branch.
2. Under **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Under **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_SUPABASE_URL`: `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_…`
4. Push to `main`. `deploy.yml` runs the typecheck, lint, unit and database tests, the Edge
   Function checks and the Playwright E2E suite, then builds and publishes the site to
   `https://<user>.github.io/<repo>/`.

**Routing.** The app uses `HashRouter` (`/#/parent/tasks`), so deep links and refreshes work on
Pages without server rewrites. The workflow also copies `index.html` to `404.html` as a fallback.

**Base path.** The workflow chooses it automatically:

- `/<repo>/` for a project site
- `/` for a `<user>.github.io` repository or a custom domain
- or whatever you set in the `VITE_BASE_PATH` variable

**Custom domain.** Set the repository variable `PAGES_CUSTOM_DOMAIN` (e.g. `heroes.example.com`).
The workflow writes the `CNAME` file and switches the base path to `/`. Point a DNS `CNAME`
record at `<user>.github.io`, then update the Site URL and redirect URLs in Supabase Auth.

**Safety checks during the build.** The build fails if the publishable key is actually a
secret or `service_role` key, or if any server-side secret appears in `dist/`.

## Testing

```bash
npm run verify          # typecheck + lint + all Vitest suites + production build
npm run test:unit       # components, i18n, scoring helpers, CSV, dates, secret guard
npm run test:db         # real migrations in PGlite: RLS isolation, scoring, initiatives, levels
npm run test:e2e        # Playwright against the QA stack (builds with base /home-heroes/)
npm run functions:check # deno check + lint of the Edge Functions (needs Deno)
```

What the suites cover:

- **Database tests** (`supabase/tests/`)
  - one family cannot read or change another family's data
  - children cannot approve work, change point values or read private notes
  - points are awarded once, even when the same request is retried
  - the daily initiative cap is enforced
  - unscheduled tasks are left out of the maximum
  - weekly levels and snapshots are calculated correctly
  - reward eligibility and fulfilment work
- **E2E acceptance** (`e2e/acceptance.spec.ts`): a father creates a family and invites the
  mother, adds children and configures tasks; children sign in and submit; a parent approves
  work and initiatives; the week is finalised with levels, rewards are recorded, and a new week
  starts with history kept.
- **E2E layout** (`e2e/layout.spec.ts`): RTL and responsive checks on desktop and mobile
  viewports.

To run E2E against a full local Supabase instead of the QA stack:

```bash
npx supabase start && npx supabase functions serve &
E2E_TARGET=supabase E2E_SUPABASE_KEY=<local publishable key> npm run test:e2e
```

## Security model

- **Row Level Security on every family table.** Access goes through helpers in the `private`
  schema that check family membership, the caller's role, and whether the user is that child.
- **Server-side writes for anything that matters.** Scores, approvals, rewards, invitations
  and week closing are `SECURITY DEFINER` functions, granted only to `authenticated`, and each
  one checks the caller's role. Browsers never send point totals.
- **Locked-down service functions.** The `svc_*` functions can be called only by
  `service_role`, which means only from inside the Edge Functions.
- **Child credentials.** The real Auth password is
  `HMAC(pepper, childId:secret)`. Knowing a child's secret alone does not let anyone sign in
  directly against Supabase Auth.
- **Protection against guessing.** Login attempts are throttled per IP and per account, and
  errors are generic so usernames cannot be discovered.
- **Audit log.** Privileged changes are written to an audit log. Parents can read it, and it
  cannot be edited.
- **No tracking.** There are no analytics or third-party requests, fonts are self-hosted,
  and no child profile is public.

## Scoring rules

These are the defaults. Parents can change all of them under **Scoring settings** and **Levels**.

| Event | Points |
|---|---|
| Done after a reminder | +1 |
| Done independently | +2 |
| Not done / not applicable | 0 (not applicable is left out of the maximum) |
| Approved initiative | +1 each, at most 2 per day |

With the seven default daily tasks, a child can earn at most 14 points from tasks plus 2 from
initiatives, so 16 per day.

**Weekly % = approved points ÷ maximum eligible points × 100.** The maximum includes the
initiative allowance for each eligible day.

| Level | Range | Default reward |
|---|---|---|
| 🥇 Gold (الذهبي) | 90–100% | 10 AED + premium privilege |
| 🥈 Silver (الفضي) | 75 to under 90% | 5 AED |
| 🥉 Bronze (البرونزي) | 60 to under 75% | small privilege |
| 🌱 Growing (في طريق التميز) | under 60% | encouragement + improvement plan |

Changes to tasks and rules take effect from a chosen date. Weeks that are already finalised
keep their snapshot and are never recalculated.

## Troubleshooting

| Symptom | Fix |
|---|---|
| The deployed site shows "Setup required" | `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` was not set when the site was built. Add the variables and re-run the workflow. |
| Child login or adding a child fails with `internal_error` | Check the function logs. The usual cause is that `CHILD_CREDENTIAL_PEPPER` is missing or shorter than 32 characters. Set it and redeploy the functions. |
| A CORS error when calling the functions | `ALLOWED_ORIGIN` must match the site origin exactly (scheme and host, no path). |
| Email links open the wrong page | Check the Site URL and the redirect URL `https://<user>.github.io/<repo>/**` in Supabase Auth. |
| Assets return 404 on Pages | The base path does not match the repository name. Set `VITE_BASE_PATH`. |

## License

Private family project. All rights reserved unless a licence is added.
