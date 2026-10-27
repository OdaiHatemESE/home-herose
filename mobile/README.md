# أبطال البيت — phone & tablet app (Expo)

The Home Heroes app for phones and tablets, built with Expo and React Native. It uses the same
stack as قديش.

The **backend and business rules are the website's**: the same Supabase project, RLS policies,
scoring engine and Edge Functions. The app reuses the website's database types, its date and
scoring helpers, and its Arabic/English strings directly from `../src`. Nothing is duplicated.

## Screens by device

| Width | Navigation | Content |
|---|---|---|
| Phone (< 768) | top bar, bottom tab bar, and a menu sheet for everything else | single column |
| Tablet portrait (768 – 1099) | slim icon rail on the start side | two-column grids |
| Tablet landscape / desktop (≥ 1100) | full sidebar with grouped sections | side-by-side layouts (e.g. the child's progress next to today's tasks) |

The layout is mirrored by hand for Arabic, as in قديش, so switching language takes effect at once.
Children in simple mode (the youngest) get big tiles and four large tabs on every device.

## Conversion status

| Done | Next phases |
|---|---|
| Welcome, parent and child sign-in, registration, password reset, invitations, privacy | Approvals, initiatives, week results, family members, tasks and schedule |
| Onboarding (all five steps, same server calls) | Scoring, levels, rewards, skills, notes, reports, activity log, settings |
| Parent dashboard: counters, week cards, today board with remind and record actions, trends chart | Child stars, rewards, achievements, skills, feedback, profile |
| Child dashboard, my tasks, task detail with checklist, simple-mode tiles | Push notifications, native builds |

Pages not converted yet show a clear message, with a button that opens the same page on the
current website.

## Run

```bash
npm ci
npx expo start          # Expo Go on a phone/tablet, or press w for the browser
npx tsc --noEmit && npx expo lint
```

To work against the local QA stack instead of the real project:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_local_demo EXPO_PUBLIC_DEMO_MODE=true npx expo start --web
```

## Publishing

- **Test link:** every push to `main` publishes the web preview at `https://<user>.github.io/<repo>/app/`
  (`.github/workflows/deploy.yml`).
- **Android / iOS builds:** these are made only when the family approves the test link. They use
  the same approach as قديش (`expo prebuild` and Gradle for the APK, or EAS Build).
