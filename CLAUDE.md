# CLAUDE.md

**Spawnpoint** is an open-source home management PWA. Households use it to share chores, shopping lists, a home inventory with receipts and QR labels, plans and trips, and calendar sync. A light, never-shaming reward system (levels, badges, personal coins) and 21 theme packs make it fun.

- One deployment is run by one **operator**, and many **households** use it. Friends and family join by invite link. Each household's data is walled off from every other household.
- The full product spec is in `docs/SPEC.md`, and the theme packs are defined in `docs/THEMES.md`. Read both before starting any feature, and follow the build phases in order.

## Stack

- Vite + React 18 + TypeScript (strict mode)
- Tailwind CSS, driven by theme tokens defined as CSS variables (see Theming)
- Supabase: Postgres, Auth (Google OAuth only), Storage (private buckets), Realtime
- TanStack Query for server state. Supabase Realtime events invalidate queries.
- React Router
- `vite-plugin-pwa` for an installable app with an offline shell
- Netlify for hosting the frontend, and Netlify Functions for scheduled jobs, the ICS feed, and anything that needs the service role key
- `date-fns` + `date-fns-tz`, `zod` for input validation, Vitest for tests, pgTAP for database tests, Playwright for smoke tests (added in Phase 1)

## Commands

Keep this section current as you add scripts.

```
npm run dev          # Vite dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest
npm run test:db      # pgTAP tests against local Supabase
supabase start       # local Supabase (Docker)
supabase db reset    # re-run migrations + seed.sql
npm run db:types     # supabase gen types typescript --local > src/lib/database.types.ts
```

## Layout

```
src/app/               routes, app shell, tab bar, auth and household gates
src/modules/<module>/  components/, hooks.ts, api.ts, logic.ts, logic.test.ts
src/modules/rewards/   deeds.ts (universal catalog), levels.ts, display logic
src/components/ui/     shared primitives (Button, Panel, Sheet, Toast, Chip...)
src/lib/               supabase client, dates, auth helpers, database.types.ts
src/theme/             theme engine, base tokens, useCopy, themes/<id>/ packs
supabase/migrations/   SQL migrations
supabase/tests/        pgTAP tests
supabase/seed.sql      fictional demo households only
netlify/functions/     server-side functions
docs/                  SPEC.md, THEMES.md, DECISIONS.md, PLAN.md
```

## Non-negotiables

1. **This is a public repo.** Never commit secrets, real names, real emails, addresses, receipts, or other personal data. All config goes through env vars. Keep `.env.example` current. Personal seed data goes in `supabase/seed.local.sql`, which is gitignored.
2. **Households are isolated in the database.** Every household-owned table has `household_id` and RLS policies built on `is_member_of(household_id)`. Storage paths start with `household_id` and have matching policies. A table without RLS, or a query that relies on the UI to filter by household, is a bug. pgTAP tests prove that a member of household A can't read or write household B.
3. **Invite-only.** Anyone can complete Google sign-in, but a new user can only create a household with an operator invite, or join one with a member invite. Everyone else sees a friendly "you'll need an invite" screen.
4. **Rewards are computed by the database.** XP, coins, levels, and badges are awarded by Postgres functions and triggers. Clients can never insert or update XP, coin, or badge rows directly, and RLS denies it. The reward constants in `docs/SPEC.md` are the same for every household and are not configurable, so levels mean the same thing everywhere.
5. **Never shame.** No leaderboards, rankings, "top contributor" labels, or side-by-side numbers comparing members, anywhere. A member's XP, level, and coins are visible only to that member. Nothing is ever subtracted as a penalty. No negative copy about missed tasks or inactivity.
6. **Scheduling logic is pure and tested.** Due dates, carry-over, and no-stacking rules live in pure functions in `src/modules/chores/logic.ts` with thorough Vitest coverage. UI code never computes due dates itself.
7. **Dates use the household timezone.** Store `done_on` as a `date` in `households.timezone`, and store instants as `timestamptz`. Never use the browser's timezone for scheduling or reward days.
8. **Mobile first, low effort.** Design at 390px wide first. Every primary action is reachable with one thumb and takes one tap. Use optimistic updates with an undo toast instead of confirmation dialogs.
9. **Accessible.** Visible focus states, labels on all controls, 4.5:1 text contrast in every theme and mode. Honor `prefers-reduced-motion` by turning off confetti and bouncy motion.
10. **Original art and names only.** Themes evoke a genre or a feeling, never a specific product. No names of games, leagues, teams, franchises, or characters anywhere: code, copy, comments, commit messages, or docs. No logos, mascots, character likenesses, signature objects, franchise fonts, sounds, or branded phrases. Every avatar and illustration is drawn for this repo. Follow the "Avoid" list for each theme in `docs/THEMES.md`.
11. **Modules can be toggled.** `household_settings.modules` turns modules on or off per household.

## Conventions

- One migration per change, named `YYYYMMDDHHMMSS_description.sql`. Never edit a migration that has been applied. Regenerate types after each one.
- Each module's data access goes in its `api.ts`. Components never call Supabase directly.
- IDs are UUIDs. Every household-owned table has `household_id`, `created_at`, `updated_at` (set by trigger), and `created_by`.
- Tasks, items, plans, and lists are archived with `archived_at`. List entries are hard-deleted.
- Deed keys in `src/modules/rewards/deeds.ts` are permanent. Add new deeds, but never rename or remove a key.
- Keep components small. Don't add a UI library without a reason written in `docs/DECISIONS.md`.
- Commit in small, working steps with clear messages.
- When a phase item ships, tick it in the Status section of `docs/SPEC.md`.

## Theming

- Themes are packs in `src/theme/themes/<id>/`, structured as described in `docs/THEMES.md`.
- The active pack is set with `data-app-theme="<id>"` on `<html>`. Light or dark mode is set with `data-theme="light|dark"`, or follows `prefers-color-scheme` when unset. Each pack defines every shared token for both modes.
- Tailwind reads the shared tokens through `theme.extend`. Components use tokens only, never raw hex values, and never check which theme is active.
- All user-facing words go through `useCopy()`. Never hard-code theme vocabulary like "Mission" or "Quest" in a component.
- Celebrations, effort icons, badge frames, and level titles come from the active pack.
- The household picks a default theme, and each member can override it. Store this in `household_settings.default_theme` and `household_members.theme`.
- A test checks every theme's text and background token pairs for 4.5:1 contrast in both modes.

## When unsure

Check `docs/SPEC.md` first. If it doesn't answer the question, pick the simplest option that keeps data private, keeps households isolated, and keeps the app easy to use. Record the decision in one or two lines in `docs/DECISIONS.md`, and keep going.
