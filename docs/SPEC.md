# Spawnpoint — Product Spec

## 1. Overview

**Who it's for:** households of 1–6 people (usually couples) who share chores, shopping, belongings, and plans. Most users aren't technical.

**How it's run**
- One **operator** runs one deployment: a Supabase project (database, logins, file storage) plus a Netlify site (the web app).
- Many **households** use that deployment. People open the link, sign in with Google, and create or join a household by invite.
- Each household's data is completely separate from every other household's.
- Developers can run their own copy. The README has a self-hosting section, but it isn't the main path.

**Goals**
- Keeping a home running feels light, and a little fun.
- Everyone in a household sees the same live state on their own phone.
- Paperwork can be photographed, attached to the thing it's for, and thrown away.
- Logging something takes one tap, including after the fact.
- Progress is rewarding and comparable in conversation ("I just hit level 20"), and never shaming.

**Not in v1:** friends lists or any cross-household features, native apps, budgeting or bill pay, public sharing links.

## 2. Look and feel

The app ships with **21 theme packs**, fully defined in `docs/THEMES.md`. A theme changes the palette, type, panel shapes, textures, effort icons, vocabulary, badge frames, level titles, and celebrations. The data and layout stay the same.

- **Classic** is the default for new households.
- The setup wizard and Personal settings show a **theme gallery** that previews the member's real Today screen in each theme.
- The household picks a default theme, and **each member can pick their own**.
- Every theme is original work. See the rules at the top of `docs/THEMES.md`.

In every theme:
- **Members as characters.** Each person picks an original avatar from their theme's set, or uploads a photo, and picks a color. Pets can be added as mascots, for display only.
- **Copy tone:** short, warm, a bit playful. No shaming. An overdue item reads "Waiting since Mon" (or the theme's version), never "OVERDUE".
- **Sound:** optional and off by default.

## 3. Navigation

The mobile bottom tab bar is **Today · Lists · Stuff · Plans · Me**, with a floating **Scan** button.

- **Me** holds the member's level, badges, coins, and reward shop.
- The **More** menu inside Me holds Areas, History, Calendar, Settings, and Household.

## 4. Modules

### 4.1 Accounts, households, and invites

**Roles**
- **Operator:** anyone whose email is in the `OPERATOR_EMAILS` env var. Operators can create household invites and see the operator page. They cannot see any household's content in the app.
- **Household owner:** manages members, invites, settings, and can delete the household.
- **Member:** everything else.

**Sign-in and joining**
- Google sign-in through Supabase Auth, requesting only the basic `openid email profile` scopes.
- After sign-in, a user with no household sees two choices:
  - **"I have an invite link"**
  - **"Start a household"**, which needs an operator invite code
- `HOUSEHOLD_CREATION` is an env var:
  - `invite_only` (the default): new households need an operator invite.
  - `open`: anyone can create a household.
- **Operator invites** (`/start/{code}`) are created on the operator page. Each is single-use and expires in 14 days. Opening one starts the household setup wizard.
- **Member invites** (`/join/{code}`) are created by a household owner. Each expires in 7 days and is single-use by default. Owners can revoke them.
- A user belongs to one household in v1.

**Household setup wizard:** name, timezone, invite the partner by link, areas from a template (house, apartment, or custom), modules on or off, starter tasks picked from the library, and each person's theme from the gallery.

**Operator page (`/operator`)**
- Counts of households and members.
- Storage used per household, shown as sizes only.
- Create and revoke household invites.
- No way to browse any household's data.

**Your data**
- Any member can export their household's data as JSON plus a zip of documents.
- An owner can delete the household, which also deletes all of its files.
- Any user can delete their account.
- An in-app **Privacy** page explains in plain words:
  - who runs this copy (`OPERATOR_NAME` env var);
  - what's stored;
  - that the operator can technically access the database;
  - how to export or delete data.

**Storage limits:** `HOUSEHOLD_STORAGE_MB` sets a per-household quota (default 250). Images are compressed on the device before upload.

### 4.2 Locations

Chores and Stuff share one location tree:

- **Zone** (Upstairs, Downstairs, Outside)
- **Area** (Kitchen, Master bedroom, Pool, Driveway)
- **Spot** (Hall closet top shelf, Garage cabinet 2)

The `locations` table has `parent_id`, `kind` (`zone`, `area`, or `spot`), `name`, `icon`, and `sort`.

Each area page shows that area's chores with a freshness bar, and the stuff stored there.

### 4.3 Chores (the core module)

**Task fields:** title, notes, `location_id`, effort (1–3), priority (`low`, `normal`, `high`), schedule, `if_missed` (`carry`, `let_go`, or `if_needed`), assignee (a member, or null for anyone), optional `deed_key` (see 4.9), optional quantity unit (for example "valves"), and `archived_at`.

**Schedule types**

| Type | Meaning | How the next due date is set |
|---|---|---|
| `daily` | every day | fixed |
| `every_n_days` | every N days | floating: last `done_on` + N |
| `weekly_on` | on one or more weekdays | fixed calendar days |
| `monthly_on` | a day of the month, or "first Saturday" | fixed |
| `yearly_in` | a list of months, due any time in that month | fixed window |

**Rules**

1. **No stacking.** A task has at most one open occurrence. A new occurrence replaces an unfinished older one, so a weekly task missed twice still shows once.
2. **Carry over** (`carry`): an unfinished occurrence stays on Today as "Waiting since {day}" until it's done, skipped, or replaced by the next occurrence.
3. **Let go** (`let_go`): an occurrence quietly leaves Today when its day ends. It's recorded as missed, with no red badge and no penalty.
   - **As needed** (`if_needed`): a check, like running the dishwasher. It shows in its own "If needed today" section. Doing it counts as done; leaving it records nothing (not skipped, not missed), and it doesn't count toward freshness or clean sweeps.
4. **Skipped counts as handled.** For floating schedules, both done and skipped completions restart the clock.
5. **Sort order for Today:** today's items first. Then carry-overs, ranked by lateness ratio (days late ÷ interval) times a priority weight. Show at most 3 carry-overs, and put the rest behind "Show more".

**Logging completions**

- **Tap:** done today, by me.
- **Long-press or "…" menu:** done yesterday, 2 days ago, or on a picked date (never a future date, never before the task existed). Done by another member. A quantity, when the task has a unit ("10 valves"). Skip, with an optional reason.
- **Catch-up screen ("What got done?"):** lists the last 7 days of unfinished occurrences. Tick them, pick a day chip for each, and submit them all at once.
- **Undo:** a toast stays for 6 seconds after any completion. Undo also reverses any rewards the completion earned.

**`completions` table:** `task_id`, `done_on` (the date the work actually happened, in the household timezone), `logged_at`, `done_by`, `logged_by`, `kind` (`done` or `skipped`), `quantity`, and `note`.

**Views**

- **Today:** what's due and what's carried over, the household's weekly meter, and today's zone if a rotation is set.
- **Areas:** a freshness bar per area, showing the share of that area's tasks that aren't overdue.
- **Upcoming:** the next 7 days.
- **History:** filterable by area and date. It shows who did what as plain entries, never as counts per person.

**Zone rotation (optional):** map weekdays to areas, for example Monday is Kitchen. Tasks in that area inherit the weekday.

**Starter task library:** generic templates in `src/modules/chores/library.ts`, listed in Appendix A. Each template has an effort level and, where it fits, a deed key.

### 4.4 Lists

Every list type runs on one generic lists engine. Lists update live, can be reordered, have quick-add at the top, and support swipe to check or delete.

- **Groceries:** name, quantity (free text), and category (produce, dairy, meat, bakery, pantry, frozen, drinks, household, pets, other). The category is guessed from a small keyword map and can be edited.
  - Store mode groups items by category. Checked items move to "In cart", and "Done shopping" clears them while keeping them in history for suggestions.
  - **Staples:** recurring items you can re-add with one tap.
- **To buy** (general purchases): name, notes, destination area, priority, target price, links, and status (`idea` → `to_buy` → `bought`). Marking an item bought offers "Add to Stuff", prefilled with name, price, store, date, and area, plus a receipt upload.
- **To-do:** household to-dos with an optional due date, assignee, and a "discuss" flag.
- **Custom lists:** households can make their own, like a packing list or gift ideas.

### 4.5 Pantry inventory (optional, off by default)

- **Items:** name, storage place (fridge, freezer, pantry, or custom), quantity and unit, low-stock threshold, optional expiry date, optional barcode.
- When quantity drops to the threshold or below, offer to add the item to Groceries, or add it automatically if that setting is on.
- **Barcode scanning:** use `BarcodeDetector` where the browser supports it, with `@zxing/browser` as the fallback. Optionally look up product names from the Open Food Facts API, and handle misses gracefully.
- Keep it low-friction: a "Used up" button and a +/- stepper.

### 4.6 Stuff (home inventory and documents)

**Items:** name, category (electronics, appliance, networking, furniture, tools, outdoor, other), brand, model, serial, purchase date, price, store, `warranty_until`, `location_id` plus spot text, tags, notes, photos, barcode, and status (`active`, `lent`, `sold`, `donated`, `disposed`).

**Documents**
- A document is attached to an item, or stands alone as a household document (insurance, lease, and so on).
- Kinds: receipt, manual, warranty, photo, other.
- Files live in the private Supabase Storage bucket `docs` at `{household_id}/{item_id|household}/{uuid}.{ext}`.
- Upload from the camera or a file picker. Compress images on the client. Allow PDFs. Maximum 20 MB per file, within the household quota.
- Show thumbnails, and open files through signed URLs.
- Items also have a URL field for manufacturer manuals and support pages.

**Search:** a global "Where is…" search across item name, tags, location, brand, and model.

**Warranty watch:** a list of warranties ending in the next 60 days, also included in the morning digest.

**QR labels**
- Every item and every location gets a short code (8 characters, base32, unique across the deployment) when it's created.
- The label URL is `{SITE_URL}/s/{code}`. It opens the item or location for members of that household. Anyone else sees sign-in or "not your household". The code by itself reveals nothing.
- **Print labels page:** select items or locations and get a sheet of labels (QR code, name, location) sized for common label stock, such as 1" × 2⅝" 30-up sheets and 2" squares. Uses browser print with `@media print` CSS.
- **In-app scanner** (the Scan button) reads our QR codes, and also manufacturer barcodes, matched against the stored `barcode` field.
- Phone camera apps that scan a label open the site directly.
- A location label, like "Garage cabinet 2", lists everything stored in that location.

### 4.7 Plans (projects and trips)

For bigger things that need discussion and planning: trips, projects, decisions, events.

- **Fields:** title, type (`trip`, `project`, `decision`, `event`), status (`someday` → `discussing` → `planning` → `booked` → `done`), optional date range with a "tentative" flag, an icon and color chosen from a set, markdown notes, a checklist, links, an optional budget estimate, and attached documents like itineraries and confirmations.
- **Talk-it-over queue:** anything flagged "discuss" in Plans or To-do shows up here for a weekly sit-down. Marking an item discussed records a short decision note.
- **Views:** a board by status, and a timeline by date with countdowns ("42 days").

### 4.8 Calendar

- **Phase A (no Google API):** each member gets a private ICS feed from a Netlify Function at `/.netlify/functions/ics?token=…`. Tokens are random 32-byte values, stored hashed, and revocable.
  - The feed includes plans with dates, to-dos with due dates, and chores according to a setting: none, high priority only, or all fixed-day chores.
  - Members subscribe in Google Calendar with "From URL". The setup screen should explain that Google refreshes subscribed calendars on its own schedule, which can take several hours.
- **Phase B (optional, operator setting):** two-way Google Calendar sync for Plans, using the `calendar.events` scope.
  - This is a sensitive scope, so Google requires app verification before it can be offered widely. Leave it off by default, and document the verification steps.
- **In-app Calendar:** month and agenda views of the same items.

### 4.9 Rewards: levels, badges, and coins

**Principles**
1. **Nothing is ever taken away.** No XP loss, no penalties, no decay.
2. **No comparisons in the app.** No leaderboards, rankings, or side-by-side numbers. Your XP, level, and coins are visible only to you.
3. **Consistency beats volume.** A daily soft cap means a few things most days levels you about as fast as marathon cleaning. A small apartment and a big house with a pool level at comparable speeds.
4. **Universal rules.** Every constant below is the same for every household and not configurable, so "level 20" means the same thing in every home and every theme.
5. **Invisible work counts.** Planning, shopping, paperwork, and logging for others all earn XP.

**Earning XP**

| Action | XP |
|---|---|
| Complete a task, effort 1 / 2 / 3 | 10 / 20 / 30 |
| Log a deed (see below) | the deed's value, 10–60 |
| Upload a receipt, manual, or warranty | 5 |
| Add an item to Stuff | 5 |
| Finish a shopping trip (Done shopping) | 10 |
| Move a plan to `booked` or `done` | 20 |
| Resolve a talk-it-over item | 5 |
| Log a completion for another member | the doer gets the task's XP, and the logger gets 2 |
| Welcome-back bonus (first activity after 7+ quiet days) | 20 |
| Skip | 0 |

- XP is credited to the **day the work was done** (`done_on`), so late logging earns full credit.
- XP is recalculated if a completion is undone or its date is changed.

**Daily soft cap** (per person, per household-timezone day)
- The first 40 XP count in full.
- The next 40 XP count at 50%.
- Anything beyond that counts at 10%.
- Deed XP is outside the cap, but each deed has a cooldown before it can earn XP again (see the catalog), so it can't be farmed. Deed badges still count every log.

**Levels**
- XP needed to go from level L to L+1 is `100 + 25 × (L − 1)`.
- At a typical 40–50 credited XP a day, that means:

| Level | Total XP | Roughly |
|---|---|---|
| 5 | 550 | 2 weeks |
| 10 | 1,800 | 6 weeks |
| 20 | 6,175 | 4–5 months |
| 35 | 17,425 | about a year |
| 50 | 34,300 | about 2 years |

- There's no level cap.
- The **level number** is universal. Each theme gives it a **title** by level band (1, 5, 10, 20, 35, 50+), as listed in `docs/THEMES.md`.

**Badges**

There are two families, both universal and keyed in `src/modules/rewards/deeds.ts`.

- **Deeds** are real-world accomplishments. The same deed means the same thing in every home, which makes them the most comparable part of the system ("I got gold in Valve Master").
  - Each deed has: a key, a neutral name, a category, an XP value, a cooldown in days, tier thresholds (bronze, silver, gold, counted in logs or in units), a unit where relevant ("valves", "filters"), and applicability tags (`any`, `house`, `yard`, `pool`, `pets`).
  - A deed is earned by completing a task linked to it (library tasks come linked, and custom tasks can pick one) or with the **Log a fix** button on Today, which opens a searchable deed picker for one-off jobs like fixing a toilet flapper.
  - Quantities count toward unit-based tiers. Exercising 10 shutoff valves counts 10.
  - The starting catalog is Appendix B. It can grow through pull requests, and keys are never renamed.
- **Milestones** are about consistency and habits:
  - **Active weeks:** 4, 12, 26, and 52 weeks with activity on at least 3 days.
  - **Early bird / Night owl:** 10 tasks done before 8am, or after 9pm.
  - **Helping hand:** 10 completions logged for someone else.
  - **Catch-up:** 5 catch-up sessions.
  - **Comeback:** return after a break.
  - **Clean sweep:** every task in an area done in one week.
  - **Paper trail:** 10, 50, or 100 documents uploaded.
  - **Curator:** 25, 100, or 250 items in Stuff.
  - **Labeler:** 10 QR labels printed.
  - **Declutter:** 10 items donated or disposed.
  - **Trip booked**, and **Plans finished**.
  - **Seasonal badges** for each quarter's season track.

**Badge display**
- Badge names and icon glyphs are universal.
- The theme supplies the frame and colors, and its own word for badges (Commendation, Badge, Achievement, Patch, and so on).
- Badges earned show on the member's Me page. A new badge also appears as a small celebration in the household feed ("Nat earned Clean Sweep: Kitchen"). This is a shared moment, not a ranking, and each member can turn it off.

**Seasons:** each calendar quarter has a season track of 10 seasonal goals, with a seasonal badge for finishing 5 or more. Levels carry over. The season gives everyone something fresh to work toward.

**Streaks:** tracked in active weeks (3 or more active days), never daily. A streak is never shown as "broken". The Me page shows total active weeks and the current run.

**Coins and personal reward shops**
- Each member earns coins equal to their credited XP.
- Coins belong to that person and can't be transferred.
- Each member builds their **own reward shop**: name, icon, and coin cost, like "Buy a card pack: 300" or "Sleep in Saturday: 150". It's private to them.
- Redeeming spends the coins and records the redemption. Members can choose to post it to the household feed. The balance can never go below zero.
- The starter suggestions are editable.

**Household weekly meter:** the shared progress bar on Today. Its target is set per household in the same units as credited XP. The theme names it and celebrates when it fills. It shows the household total only, never a per-person split.

**Share card:** a button on the Me page makes an image with level, title, badge count, top three badges, and theme art. It never includes household data.

**Enforcement**
- A trigger on `completions` (and on other earning actions) writes `xp_events`: member, source, day, raw XP, and credited XP.
- `recompute_day(member_id, day)` applies the cap after inserts, deletes, and date changes.
- Badge progress and coin balances are updated by security-definer functions.
- `redeem_reward()` checks the balance in the database.
- Members can read only their own reward rows. Nobody can write XP, coins, or badges directly.

### 4.10 Notifications and digest

- PWA web push, with VAPID keys in env vars. On iOS, push works only after the app is added to the Home Screen (iOS 16.4 or later), so show an onboarding tip about that.
- A scheduled Netlify Function runs every 15 minutes. It sends each household's digest at that household's digest time: a push like "Today: 3 things". On Sundays it sends the recap, which shows household totals and each person's highlights (badges earned), with no per-person counts.
- **Limits:** at most one digest a day, plus opt-in reminders for specific tasks at set times (for example, trash night at 8pm). Respect quiet hours.

### 4.11 Settings

- **Household:** name, timezone, members and invites, modules on or off, weekly meter target, zone rotation, default theme, digest time, export, delete.
- **Personal:** theme (or follow the household), destination variant for Passport, light/dark/system, avatar, color, notifications, badge celebrations on or off, ICS link, delete account.

## 5. Data model (starting point)

- **Accounts and households:** `households`, `household_members`, `household_settings`, `invites` (kind `household` or `member`)
- **Places:** `locations`
- **Chores:** `tasks`, `completions`
- **Lists:** `lists`, `list_items`, `staples`, `pantry_items`
- **Stuff:** `items`, `documents`, `short_codes`
- **Plans:** `plans`, `plan_checklist_items`
- **Rewards:** `xp_events`, `deed_logs`, `badge_progress`, `rewards` (personal shop), `redemptions`, `feed_events`
- **Delivery:** `ics_tokens`, `push_subscriptions`

Every household-owned table has `id` (uuid), `household_id`, `created_at`, `updated_at`, and `created_by`. Reward tables also have `member_id`. Adjust as needed and record the reason in `docs/DECISIONS.md`.

## 6. Security

- `is_member_of(hid)` returns true when an active `household_members` row links `auth.uid()` to household `hid`.
  - Every household-owned table allows select, insert, update, and delete only when `is_member_of(household_id)`.
  - Managing members and invites is owner-only.
- **Reward tables:**
  - Select only where `member_id` is the caller's own member row. The exception is `feed_events`, which the whole household can read.
  - No client inserts or updates. Writes happen only through security-definer functions.
- **Operator functions** check the caller's email against the `operators` table, which is seeded from `OPERATOR_EMAILS`. They return counts and sizes only.
- The storage bucket `docs` is private. Its policy requires `is_member_of` for the `household_id` path prefix, and enforces the household quota.
- Invite codes are random, stored hashed, expire, and are rate-limited.
- The service role key is used only inside Netlify Functions and is never sent to the client.
- `netlify.toml` sets security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. The camera is allowed for self.

## 7. Build phases

- **Phase 0 — Foundation:**
  - Scaffold, CI, `netlify.toml`, PWA manifest and icons.
  - The theme engine with the **Classic** and **Squad HQ** packs, the base UI kit, and a `/styleguide` route with theme and mode switchers.
  - Supabase schema for households, members, settings, invites, operators, and locations, with RLS and pgTAP isolation tests.
  - Google sign-in, invite flows, the setup wizard, and the operator page.
- **Phase 1 — Chores:** tasks, schedule logic with tests, Today, backdating, catch-up, skip, undo, Areas, Upcoming, History, zone rotation, and the starter library.
- **Phase 2 — Rewards:**
  - The deed catalog, XP triggers and `recompute_day` with pgTAP tests, levels and titles, milestones, deeds and **Log a fix**.
  - The Me page, personal reward shops and redemption, the household weekly meter, the household feed, seasons, and the share card.
- **Phase 3 — Lists:** groceries with store mode and staples, to buy, to-do, custom lists, realtime updates.
- **Phase 4 — Stuff:** items, locations UI, document upload with quotas, search, QR codes, label printing, the scanner, warranty watch, and "bought → Add to Stuff".
- **Phase 5 — Plans:** plans, the talk-it-over queue, the Calendar view, and the ICS feed.
- **Phase 6 — Theme packs:**
  - The remaining 19 themes from `docs/THEMES.md`, one per commit. Each comes with its avatars, copy, titles, badge frames, celebration, effort icons, a passing contrast test, and a styleguide screenshot in `docs/themes/`.
  - Theme-specific views come with their themes: the Pack Pull binder, the Quest Journal map, the Island Days island map, the Sunny Acres crop plots, and the Block Party build meter.
- **Phase 7 — Extras:** push notifications and the digest, the pantry module, data export and deletion, the Privacy page, and optional two-way Google Calendar sync.

## 8. Acceptance checks

- A signed-in user with no household and no invite can't create a household (when `invite_only`) or read anything.
- A member of household A can't read or write any row or file belonging to household B. Proven with pgTAP, and with a storage policy test.
- With two browsers signed in as two members, a check-off in one appears in the other within 2 seconds.
- Backdating a completion to Monday on a 7-day floating task sets the next due date to the following Monday. Its XP is credited to Monday.
- A weekly fixed task that's missed twice shows once.
- A `let_go` task that's missed leaves Today the next day. A `carry` task stays.
- The daily cap: 200 raw XP in one day credits 40 + 20 + 12 = 72.
- Undoing a completion removes its XP and recomputes that day.
- A client can't insert or update `xp_events`, `badge_progress`, or coin balances directly.
- Member A can't see member B's XP, level, coins, or reward shop.
- Nowhere in the UI shows two members' numbers side by side.
- Two members using different themes see the same data, each in their own theme.
- Every theme passes the contrast test in light and dark.
- The app installs as a PWA and works at 360px wide.
- No secrets, personal data, or franchise names exist anywhere in git history.

## 9. Status

Claude Code ticks items off here as they ship.

- [x] Phase 0 — Foundation
- [x] Phase 1 — Chores
- [x] Phase 2 — Rewards
- [x] Phase 3 — Lists
- [x] Phase 4 — Stuff
- [x] Phase 5 — Plans
- [ ] Phase 6 — Theme packs
- [ ] Phase 7 — Extras

## Appendix A — Starter task library

Format: task — schedule · if missed · effort (1–3) · deed key, where one applies

**Kitchen**
- Wipe counters, stovetop, and sink — daily · let go · 1
- Run dishwasher at night, empty in the morning — daily · as needed · 1
- Toss old fridge leftovers — weekly · let go · 1
- Mop kitchen floor — weekly · let go · 2
- Wipe cabinet fronts, appliances, microwave — weekly · let go · 1
- Clean dishwasher filter — monthly · let go · 1 · `dishwasher_filter`
- Freshen garbage disposal — monthly · let go · 1
- Clean range hood filter — monthly · let go · 2 · `range_hood_filter`
- Vacuum fridge coils — twice a year · let go · 2 · `fridge_coils`
- Deep clean oven — twice a year · let go · 3 · `oven_deep_clean`

**Living areas and office**
- 10-minute pickup — daily · let go · 1
- Dust top to bottom — weekly · let go · 2
- Vacuum floors and stairs — weekly · carry · 2
- Vacuum couch and under cushions — monthly · let go · 1
- Clear desk at end of day — daily · let go · 1

**Bedrooms**
- Put clothes away — daily · let go · 1
- Make the bed — daily · let go · 1
- Change sheets — every 7–14 days · carry · 2
- Vacuum bedrooms and hallway — weekly · let go · 2
- Vacuum under beds — monthly · let go · 2

**Bathrooms**
- Clean toilet, sink, mirror, shower — weekly · carry · 2
- Check caulk around tubs and sinks — twice a year · let go · 1 · `recaulk` (when re-caulked)

**Laundry**
- Wash, dry, fold, put away — weekly · carry · 2
- Run washer cleaning cycle — monthly · let go · 1 · `washer_clean`
- Clean dryer vent duct — yearly · carry · 3 · `dryer_vent`

**Pets**
- Scoop litter boxes — daily · carry · 1 · `litter_duty`
- Fresh water — daily · carry · 1
- Wash bowls and fountain — weekly · carry · 1
- Dump and wash litter boxes — monthly · carry · 2

**Pool**
- Skim, empty skimmer and pump baskets — weekly · carry · 1
- Brush walls, steps, waterline — weekly · let go · 2
- Test and adjust water chemistry — twice weekly · carry · 1 · `pool_chemistry`
- Check water level — weekly · carry · 1
- Check filter pressure, clean or backwash as needed — monthly · carry · 2
- Scrub tile line — monthly · let go · 2
- Deep clean filter — twice a year · carry · 3 · `pool_filter_deep_clean`

**Yard, driveway, side yard**
- Sweep or blow driveway and walks — weekly · let go · 1
- Sweep or hose patio — weekly · let go · 1
- Water potted plants — every 2–3 days · carry · 1
- Pull weeds, check beds — weekly · let go · 2
- Test sprinklers, fix broken heads — monthly · let go · 2 · `sprinkler_fix` (when a head is fixed)
- Adjust sprinkler timer for the season — seasonal · let go · 1
- Trim shrubs and hedges — seasonal · let go · 3 · `hedge_trim`
- Pressure wash hard surfaces — twice a year · let go · 3 · `pressure_wash`
- Clear gutters and downspouts — yearly, fall · carry · 3 · `gutters`
- Trash and recycling to the curb — weekly, the night before pickup · carry · 1

**Systems and safety**
- Check HVAC filter, replace if dirty — every 30–60 days · carry · 1 · `hvac_filter` (when replaced)
- Test smoke and CO alarms — monthly · carry · 1 · `alarm_test`
- Replace smoke alarm batteries — yearly · carry · 1 · `alarm_batteries`
- Exercise water shutoff valves — twice a year · carry · 1 · `valve_exercise`, unit: valves
- Prep outdoor spigots before freezing nights — yearly · carry · 1 · `spigot_winterize`
- Flush water heater — yearly · carry · 3 · `water_heater_flush`

## Appendix B — Starting deed catalog

Format: key — name · category · XP · cooldown in days · tiers (bronze / silver / gold) · applies to

**Plumbing and water**
- `toilet_flapper` — Fixed a running toilet · plumbing · 40 · 30 · 1/3/10 · any
- `drain_unclog` — Unclogged a drain · plumbing · 30 · 7 · 1/5/15 · any
- `faucet_fix` — Fixed a leaky faucet · plumbing · 40 · 30 · 1/3/10 · any
- `valve_exercise` — Exercised shutoff valves · water · 20 · 60 · 10/50/150 valves · any
- `spigot_winterize` — Winterized outdoor spigots · water · 20 · 180 · 1/3/5 · house
- `water_heater_flush` — Flushed the water heater · water · 50 · 180 · 1/3/5 · house
- `recaulk` — Re-caulked a tub, shower, or sink · plumbing · 40 · 90 · 1/3/8 · any

**Heating, air, and safety**
- `hvac_filter` — Replaced an HVAC filter · systems · 20 · 20 · 3/12/36 filters · any
- `alarm_test` — Tested smoke and CO alarms · safety · 10 · 25 · 3/12/36 · any
- `alarm_batteries` — Replaced alarm batteries · safety · 20 · 180 · 1/3/5 · any
- `dryer_vent` — Cleaned the dryer vent duct · safety · 50 · 180 · 1/3/5 · any
- `fire_extinguisher` — Checked the fire extinguisher · safety · 10 · 180 · 1/4/10 · any

**Appliances**
- `fridge_coils` — Vacuumed fridge coils · appliances · 30 · 90 · 1/4/10 · any
- `dishwasher_filter` — Cleaned the dishwasher filter · appliances · 10 · 20 · 3/12/36 · any
- `range_hood_filter` — Cleaned the range hood filter · appliances · 15 · 20 · 3/12/36 · any
- `washer_clean` — Ran a washer clean cycle · appliances · 10 · 20 · 3/12/36 · any
- `oven_deep_clean` — Deep cleaned the oven · appliances · 40 · 60 · 1/4/10 · any

**Repairs and upgrades**
- `drywall_patch` — Patched drywall · repairs · 40 · 14 · 1/5/15 · any
- `light_fixture` — Installed or replaced a light fixture · repairs · 50 · 7 · 1/5/15 · any
- `door_fix` — Fixed a sticking door or loose hinge · repairs · 30 · 14 · 1/5/15 · any
- `furniture_assembly` — Assembled furniture · repairs · 30 · 1 · 1/10/25 · any
- `appliance_install` — Installed an appliance or device (TV, router, and so on) · repairs · 40 · 1 · 1/5/15 · any

**Outside**
- `gutters` — Cleared the gutters · outside · 60 · 90 · 1/3/8 · house
- `pressure_wash` — Pressure washed · outside · 50 · 60 · 1/4/10 · yard
- `hedge_trim` — Trimmed hedges and shrubs · outside · 40 · 30 · 1/5/15 · yard
- `sprinkler_fix` — Fixed a sprinkler head · outside · 30 · 7 · 1/5/15 · yard
- `planted_something` — Planted something · outside · 20 · 7 · 1/10/30 · any

**Pool**
- `pool_chemistry` — Balanced pool chemistry · pool · 10 · 2 · 10/50/150 · pool
- `pool_filter_deep_clean` — Deep cleaned the pool filter · pool · 60 · 90 · 1/3/8 · pool

**Pets**
- `litter_duty` — Litter duty · pets · 0 (task XP only) · — · 30/150/500 · pets
- `pet_bath` — Bathed a pet · pets · 20 · 7 · 1/10/30 · pets

**Organizing**
- `closet_reset` — Organized a closet or cabinet · organizing · 30 · 7 · 1/5/20 · any
- `garage_reset` — Organized the garage · organizing · 60 · 30 · 1/3/8 · house
