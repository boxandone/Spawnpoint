# Build plan: Phase 0 (Foundation) and Phase 1 (Chores)

This is the working plan for the first two phases in `docs/SPEC.md`. It also sketches the Phase 2 reward tables, so the chores schema doesn't block them later. Choices that fill gaps in the spec are logged in `docs/DECISIONS.md`.

---

## 1. File structure

```
.github/workflows/ci.yml          lint, typecheck, unit tests, pgTAP (Supabase CLI), build
netlify.toml                      build, SPA redirect, security headers
netlify/functions/sync-config.ts  copies OPERATOR_EMAILS + settings env vars into the DB (service role)
public/                           icons, manifest assets, theme-init.js (sets data-theme before paint)
scripts/test-db.sh                runs pgTAP: Supabase CLI if running, else a throwaway local Postgres
scripts/gen-icons.mjs             rasterizes the SVG app icon into PNG sizes (Playwright)
e2e/                              Playwright smoke tests
supabase/config.toml              local Supabase config (Google provider via env, dev email login)
supabase/migrations/              one file per change (see §2)
supabase/tests/                   pgTAP tests (see §4)
supabase/tests/shim/              minimal Supabase stand-in used only by the local fallback runner
supabase/seed.sql                 two fictional households + demo operator
src/
  main.tsx, index.css
  app/
    App.tsx, routes.tsx           router + providers
    AppShell.tsx, TabBar usage    mobile shell (Today · Lists · Stuff · Plans · Me + Scan)
    gates/                        AuthGate, HouseholdGate, OperatorGate
    auth/                         SignIn, AuthCallback, pending-invite handoff
    onboarding/                   NeedInvite, StartInvite (/start/:code), JoinInvite (/join/:code), SetupWizard
    operator/                     OperatorPage
    household/                    HouseholdProvider, useHousehold, realtime hook
    settings/                     HouseholdSettings, PersonalSettings
    me/                           MePage (profile + More menu; rewards arrive in Phase 2)
    placeholders/                 Lists, Stuff, Plans, Scan "coming soon" screens
    styleguide/                   /styleguide
  components/ui/                  Button, Panel, Chip, Sheet, Toast (+undo), TabBar, Avatar,
                                  ProgressMeter, Field, Segmented, EmptyState, Icon set
  lib/                            supabase.ts, env.ts, dates.ts, database.types.ts, queryClient.ts, cn.ts
  modules/
    households/                   api.ts, hooks.ts, logic.ts (+test): timezones, area templates
    locations/                    api.ts, hooks.ts, logic.ts (+test): tree building, ancestry
    chores/                       api.ts, hooks.ts, logic.ts, logic.test.ts, library.ts, library.test.ts,
                                  schedule.ts (zod + labels), components/…
    rewards/                      deeds.ts (Appendix B catalog, data only; Phase 2 builds the rest)
  theme/
    types.ts                      ThemePack, CopyKey, Celebration types
    registry.ts                   all packs that exist in this build
    ThemeProvider.tsx             html attributes, member/household resolution, ThemeScope
    useCopy.ts                    copy lookup with Classic fallback + {var} interpolation
    celebrate.tsx                 CelebrationLayer + useCelebrate (reduced-motion aware)
    fx.ts                         shared DOM effects (confetti, rays, slam, glow, shake)
    levels.ts                     level band → title
    base.css                      shared token defaults + primitives that read tokens
    contrast.ts, contrast.test.ts token parser + WCAG ratio + every-theme test
    Gallery.tsx                   theme gallery (renders the real TodayView per theme)
    themes/classic/               theme.ts, tokens.css, copy.ts, patterns.ts, celebrate.ts,
                                  effort.tsx, badge-frame.tsx, avatars/*.svg (12)
    themes/squad-hq/              same files
```

## 2. Migrations

| # | File | Contents |
|---|---|---|
| 1 | `…_foundation.sql` | extensions (`pgcrypto` in `extensions`), `set_updated_at()` trigger fn, `app_config`, `operators`, `households`, `household_members`, `household_settings`, `invites`, `invite_attempts`; helpers `is_member_of`, `is_owner_of`, `is_operator`, `current_member_id`, `household_today`; RLS + grants |
| 2 | `…_household_rpcs.sql` | `public_config`, `peek_invite`, `create_household`, `accept_member_invite`, `create_member_invite`, `create_household_invite`, `revoke_invite`, `remove_member`, `set_member_role`, `leave_household`, `operator_stats` |
| 3 | `…_locations.sql` | `locations` (zone/area/spot tree, composite FK keeps parents in-household, kind rules trigger), RLS |
| 4 | `…_chores.sql` | `tasks`, `completions` (composite FKs to tasks, members, locations), validation triggers (done_on not in future or before the task existed, logged_by = caller), RLS |
| 5 | `…_realtime.sql` | add household tables to the `supabase_realtime` publication (guarded) |

Conventions: every household-owned table has `id uuid`, `household_id`, `created_at`, `updated_at` (trigger), `created_by default auth.uid()`. Cross-table references inside a household use **composite foreign keys** `(household_id, x_id) → t(household_id, id)` so a row can never point at another household's row, even through a crafted insert.

### Tables (Phase 0/1)

- `app_config(key, value)`: `household_creation`, `household_storage_mb`, `operator_name`. Written only by the `sync-config` function (service role). Read via `public_config()`.
- `operators(email citext pk)`: seeded from `OPERATOR_EMAILS` by `sync-config`; no client access at all.
- `households(id, name, timezone, …)`: timezone validated against `pg_timezone_names`.
- `household_members(id, household_id, user_id, role owner|member, status active|left|removed, display_name, avatar, color, theme null=follow household, mode system|light|dark, …)`; unique active membership per user (v1: one household).
- `household_settings(id, household_id unique, modules jsonb, default_theme, weekly_target, zone_rotation jsonb, digest_time, …)`.
- `invites(id, kind household|member, household_id null for household kind, code_hash, label, expires_at, max_uses, use_count, revoked_at, …)`.
- `invite_attempts(user_id, attempted_at, ok)`: rate limit store, no client access.
- `locations(id, household_id, parent_id, kind, name, icon, sort, archived_at, …)`.
- `tasks(id, household_id, title, notes, location_id, effort 1–3, priority, schedule jsonb, if_missed, assignee_id, deed_key, unit, start_on, library_key, archived_at, …)`.
- `completions(id, household_id, task_id, done_on date, logged_at, done_by, logged_by, kind done|skipped, quantity, note, source tap|menu|catch_up, catch_up_id, …)`.

## 3. RLS policies

Helpers are `security definer`, `stable`, `set search_path = ''`, and executable by `authenticated` only.

- `is_member_of(hid)`: active `household_members` row for `auth.uid()` in `hid`.
- `is_owner_of(hid)`: same, with `role = 'owner'`.
- `is_operator()`: the caller's `auth.users.email` is in `operators`.

| Table | select | insert | update | delete |
|---|---|---|---|---|
| households | member | — (RPC) | owner | owner |
| household_members | member | — (RPC) | own row, and only profile columns (column grants) | — (RPC) |
| household_settings | member | — (RPC) | owner | — |
| invites | owner (member kind) · operator (household kind) | — (RPC) | — (RPC) | — |
| locations | member | member | member | member |
| tasks | member | member | member | member |
| completions | member | member | member | member |
| operators, app_config, invite_attempts | — | — | — | — |

Supabase grants table privileges to `anon` and `authenticated` by default, so every migration also revokes what isn't needed (`anon` gets nothing; `authenticated` gets only what the table above allows).

## 4. pgTAP tests (household isolation)

`supabase/tests/`, run with `supabase test db` (CI) or `scripts/test-db.sh` (local fallback). A shared `00_helpers` file creates fixture users and a `tests.act_as(uuid)` helper that sets `role authenticated` and the JWT claims.

1. `01_rls_enabled` – every table in `public` has RLS enabled and `anon` has no privileges on any of them.
2. `02_no_household` – a signed-in user with no household reads zero rows from every table, can't insert into any household table, and can't `create_household` without a code when `invite_only`; can when `open`.
3. `03_isolation` – member of A: zero rows of B from every table; insert/update/delete against B's rows affect nothing or raise; can't point a task at B's location, a completion at B's task, or `done_by` at B's member; can't read B's invites; `peek_invite`/functions don't leak B.
4. `04_owner_only` – a plain member can't create or revoke invites, remove members, change roles, change settings, rename the household, or edit someone else's profile; the owner can.
5. `05_operator` – non-operators get an error from `operator_stats`, `create_household_invite`; operators get counts only and still read zero household rows.
6. `06_invites` – codes are stored hashed; expired, revoked, and used-up codes fail; single-use works; wrong-code rate limit kicks in; a user already in a household can't join another.
7. `07_chores` – completions can't be dated in the future (household timezone) or before the task existed; `logged_by` must be the caller; skipped rows allowed; members can undo (delete).

## 5. Invite flows

- **Sign-in:** Google via Supabase (`openid email profile`). Before redirecting, any pending `/start/{code}` or `/join/{code}` is stored in `sessionStorage` and resumed on `/auth/callback`.
- **No household:** "You'll need an invite" screen with **I have an invite link** (paste a link or code) and **Start a household** (needs an operator code unless `public_config().household_creation = 'open'`).
- **Operator invite `/start/{code}`:** `peek_invite` validates (kind `household`) → setup wizard → `create_household(name, tz, profile, code)` consumes the code atomically.
- **Member invite `/join/{code}`:** `peek_invite` shows the household name → pick name, avatar, color, theme → `accept_member_invite`.
- **Codes:** 12 characters of Crockford base32 from `gen_random_bytes`, SHA-256 stored, shown once. Operator invites: 14 days, single use. Member invites: 7 days, single use by default, revocable.
- **Rate limit:** 10 failed attempts per user per hour, recorded in `invite_attempts`. Functions return `{ok:false, error}` instead of raising so the attempt row survives.

## 6. Theme engine

- **Attributes:** `<html data-app-theme="<id>" data-theme="light|dark">`. `public/theme-init.js` sets both before first paint from `localStorage`, following `prefers-color-scheme` when the preference is `system`; `ThemeProvider` keeps them in sync live.
- **Tokens:** each `tokens.css` has a light block `[data-app-theme='x']` and a dark block `[data-app-theme='x'][data-theme='dark']`. Shared names from THEMES.md, plus `--on-secondary`, `--on-accent`, `--on-success`, `--on-warning`, `--on-danger`, `--texture`, `--texture-opacity`. Tailwind maps them in `theme.extend` with `color-mix()` so opacity modifiers work.
- **Scopes:** `ThemeScope` sets the same two attributes on a wrapper div and provides the pack through context. Gallery tiles and styleguide previews use it, so several themes render side by side. Components never read the theme id.
- **Pack interface:** `ThemePack { id, name, description, fonts, features, badgeWord, levelTitles[6], copy, patterns, celebrate, Effort, BadgeFrame, avatars[12] }`.
- **Copy:** `useCopy()` returns `t(key, vars)`. Keys are typed from the Classic dictionary; packs override a subset; missing keys fall back to Classic.
- **Celebrations:** `useCelebrate()('taskComplete' | 'badgeEarned' | 'levelUp' | 'meterFull', anchor)`. Each pack maps events to effects in `fx.ts`; each has a reduced-motion variant chosen when `prefers-reduced-motion: reduce`.
- **Per-member override:** effective theme = `member.theme ?? settings.default_theme ?? 'classic'`; mode from `member.mode`.
- **Gallery:** renders the real `TodayView` (same component as the Today screen) inside a `ThemeScope` per pack, with the member's data (or sample tasks in the wizard).
- **Contrast test:** parses every pack's `tokens.css`, checks text/background pairs ≥ 4.5:1 in light and dark.

## 7. Chores scheduling (`src/modules/chores/logic.ts`)

Dates are ISO `YYYY-MM-DD` strings in the household timezone; arithmetic is done on UTC midnights, so DST can't shift a day.

```ts
type Schedule =
  | { type: 'daily' }
  | { type: 'every_n_days'; n: number }                       // floating
  | { type: 'weekly_on'; days: Weekday[] }                     // 0 = Sun
  | { type: 'monthly_on'; day: number }                        // 1–31, clamped to month end
  | { type: 'monthly_on'; nth: 1 | 2 | 3 | 4 | -1; weekday: Weekday }
  | { type: 'yearly_in'; months: Month[] };                    // window = whole month

todayIn(tz, now?): IsoDate
isFloating(schedule): boolean
occurrenceOnOrBefore(schedule, date, startOn): Occurrence | null   // fixed only
nextOccurrenceAfter(schedule, date, startOn): Occurrence | null     // fixed only
effectiveSchedule(task, rotation, ancestryOf): Schedule             // zone rotation
currentOccurrence(task, completions, today, ctx): OccurrenceState   // the one open occurrence (no stacking)
taskState(task, completions, today, ctx): 'due' | 'waiting' | 'handled' | 'none' (+ waitingSince, daysLate, interval)
buildToday(tasks, completions, today, ctx): { due, waiting, waitingMore }
latenessScore(state, priority): number
catchUp(tasks, completions, today, ctx, days = 7): CatchUpRow[]
upcoming(tasks, completions, today, ctx, days = 7): UpcomingDay[]
backdateBounds(task, today): { min, max }; backdateChoices(task, today)
validateDoneOn(task, doneOn, today): Result
isStale(task, completions, today, ctx); areaFreshness(tasks, completions, today, ctx)
weekBounds(today); weeklyPoints(completions, tasks, today)          // interim meter
```

**Rules**

- A fixed-schedule completion on day `c` handles the latest occurrence dated ≤ `c`. An occurrence is handled when some completion (done or skipped) falls in `[date, nextDate)`.
- Floating: next due = last handled `done_on` + N, or `start_on` if never handled. For `let_go`, an unhandled due day rolls forward by N ("missed", no penalty).
- No stacking: only the latest occurrence ≤ today is ever considered.
- `carry`: unhandled past its window → "Waiting since {day}" until done, skipped, or replaced. `let_go`: disappears after its window.
- Today sort: due items (priority weight, then effort, then title); carry-overs by `daysLate / interval × weight` (low 0.5, normal 1, high 2); top 3 shown, rest behind "Show more".

**Test cases (Vitest)**

- Each schedule type: occurrence on/before, next after, month-end clamping (31st in Feb, leap year), nth and last weekday, yearly windows across year boundaries, weekly multi-day, `start_on` respected.
- Floating: never done → due on `start_on`; backdated to Monday on a 7-day task → due the following Monday (acceptance); skip restarts the clock; latest of several completions wins; let-go roll-forward.
- No stacking: weekly fixed task missed twice shows once (acceptance); daily carry missed yesterday shows once today.
- Carry vs let go: let-go missed leaves Today the next day, carry stays (acceptance); yearly window carry.
- Skip counts as handled for fixed and floating.
- Sort order: due before waiting; lateness ratio × priority; cap of 3 with overflow; ties stable.
- Backdate bounds: never future, never before creation; choices trimmed.
- Catch-up: last 7 days only, one row per task, default chip = latest missed date, excludes handled.
- Upcoming: next 7 days, floating shows one date, excludes archived.
- Zone rotation: weekly tasks in a mapped area (or a spot under it) inherit the weekday; others unchanged.
- Freshness: share of not-stale tasks; area with spots; empty area.
- DST: `todayIn` around a DST change, and dates never drift.

## 8. Screens

| Route | Screen |
|---|---|
| `/signin`, `/auth/callback` | Google sign-in (plus dev-only email login when `VITE_DEV_EMAIL_LOGIN=true`) |
| `/welcome` | "You'll need an invite" with the two choices |
| `/start/:code` | operator invite → setup wizard |
| `/join/:code` | member invite → join |
| `/setup` | wizard: name + timezone → you → theme gallery → areas template → modules → starter tasks → invite partner |
| `/` (Today) | due, waiting (3 + Show more), weekly meter, today's zone, tap = done, long-press/… = backdate sheet (yesterday, 2 days ago, pick date, by whom, quantity, skip + reason), undo toast |
| `/catch-up` | "What got done?" rows with day chips, submit all |
| `/areas`, `/areas/:id` | freshness bars, area detail with its tasks |
| `/upcoming` | next 7 days |
| `/history` | filter by area and date; plain entries |
| `/tasks/new`, `/tasks/:id` | task editor (schedule builder, deed key, unit, assignee), archive |
| `/me` | profile + More menu (Areas, History, Upcoming, Settings, Household) |
| `/settings/personal` | theme gallery, mode, avatar, color, name |
| `/settings/household` | name, timezone, members, invites, modules, default theme, weekly target, zone rotation, areas |
| `/operator` | counts, storage sizes, create/revoke household invites |
| `/styleguide` | tokens, type, UI kit, effort, badge frames, titles, avatars, celebrations, theme + mode switchers |
| `/lists`, `/stuff`, `/plans`, `/scan` | friendly "coming soon" placeholders |

Realtime: one channel per household subscribes to `tasks`, `completions`, `locations`, `household_members`, `household_settings` and invalidates the matching TanStack Query keys.

## 9. Phase 2 reward tables (planned, not built)

- `xp_events(id, household_id, member_id, source_kind, source_id, day, raw_xp, credited_xp, meta)` – written by triggers on `completions` (and later on other earning actions). `source_id` references the completion with `on delete cascade`, so undo removes XP; the trigger then calls `recompute_day(member_id, day)`.
- `recompute_day(member_id, day)` – reapplies the 40 / 40@50% / rest@10% cap in `logged_at` order for capped sources; deed XP bypasses the cap.
- `deed_logs(id, household_id, member_id, deed_key, day, quantity, completion_id null, xp_awarded)` – cooldown is checked per member per deed.
- `badge_progress(id, household_id, member_id, badge_key, count, tier, updated_at)`.
- `member_stats(member_id pk, household_id, xp_total, coins_earned, coins_spent, level)` – maintained by definer functions; the level is derived from `xp_total`.
- `rewards(id, household_id, member_id, name, icon, cost, archived_at)` and `redemptions(id, household_id, member_id, reward_id, cost, posted)`; `redeem_reward()` checks the balance.
- `feed_events(id, household_id, member_id, kind, payload)` – household-readable.
- RLS: select where `member_id = current_member_id()` (feed: `is_member_of`); no insert/update/delete grants for clients.

What Phase 0/1 does now so this fits: `completions` already has `done_by`, `logged_by`, `logged_at`, `quantity`, `kind`, `source`, and `catch_up_id` (helping hand, early bird / night owl, catch-up milestone); tasks carry `deed_key` and `unit`; `deeds.ts` exists as data so library keys are validated today; the weekly meter component takes a number and target, so it only needs its data source swapped.
