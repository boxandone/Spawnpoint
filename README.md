# Spawnpoint

Spawnpoint is an open-source home management app for households. Share chores, shopping lists, a home inventory with receipts and QR labels, plans and trips, and calendar sync. It's an installable web app (PWA) that works on any phone.

A light, never-shaming reward system (levels, badges, personal coins) and a set of theme packs make it a little fun. There are no leaderboards and no penalties, and nobody else sees your numbers.

- **One operator, many households.** Whoever sets up a copy is its operator. Friends and family join by invite link, and each household's data is walled off from every other household's in the database.
- **Everyone sees the same live state.** A check-off on one phone shows up on the other within seconds.
- **Logging is one tap**, including after the fact ("done yesterday", "done by Sam", "10 valves").

The full product spec is in [`docs/SPEC.md`](docs/SPEC.md). The theme packs are defined in [`docs/THEMES.md`](docs/THEMES.md).

## Status

| Phase | What | State |
|---|---|---|
| 0 | Foundation: app shell, theme engine, Classic and Squad HQ packs, accounts, households, invites, operator page | Done |
| 1 | Chores: Today, backdating, catch-up, skip, undo, Areas, Upcoming, History, zone rotation, starter library | Done |
| 2 | Rewards: levels, badges, deeds, coins, reward shop, weekly meter, feed | Next |
| 3–7 | Lists, Stuff, Plans and calendar, the other 19 themes, notifications and extras | Planned |

## Screenshots

> Placeholders. Screenshots will go in `docs/screenshots/`.

| Today (Classic, light) | Today (Squad HQ, dark) | Setup wizard theme gallery | Catch-up |
|---|---|---|---|
| _coming soon_ | _coming soon_ | _coming soon_ | _coming soon_ |

## Themes

Each member can pick their own theme, so two people in one household can use the same data in different themes. Every theme has a light and a dark mode and passes a 4.5:1 contrast test.

| Theme | Feel | Status |
|---|---|---|
| Classic | Clean, friendly, and calm. The default. | ✅ Shipped |
| Squad HQ | A bright, friendly pre-match lobby | ✅ Shipped |
| Rink Night | Game night under the arena lights | Phase 6 |
| Block Party | A blocky world you build one task at a time | Phase 6 |
| Hearthfield | A quiet pixel-art farm through the seasons | Phase 6 |
| Cat Nap | Soft, pastel, and sleepy | Phase 6 |
| Good Dog | Happy, bouncy, tail-wagging | Phase 6 |
| Pocket Trainer | Cheerful, rounded handheld-adventure charm | Phase 6 |
| Quest Journal | An adventurer's journal on parchment | Phase 6 |
| Island Days | A slow, sunny island that gets nicer every day | Phase 6 |
| Sunny Acres | A sunny farm where every task is a crop | Phase 6 |
| Night Market | Paper lanterns and a bento box of tasks | Phase 6 |
| Passport | Stamps, tickets, and boarding passes | Phase 6 |
| Campfire | Plaid blankets and lantern light | Phase 6 |
| Trailhead | Topo lines and trail blazes | Phase 6 |
| Powder Day | A bluebird day at the mountain | Phase 6 |
| Hardwood | A maple court by day, a jumbotron at night | Phase 6 |
| Pack Pull | Holo foil and binder pages | Phase 6 |
| Hangar Bay | A maintenance hangar full of blueprints | Phase 6 |
| Drop Zone | A bright, chunky sky-dive lobby | Phase 6 |
| Command Center | A calm, dark ops console | Phase 6 |

Every theme is original work that evokes a genre, never a specific product. All avatars and art are drawn for this repo.

---

## Operator setup (first time)

This walks you through running your own copy for your household, friends, and family. It takes about 45 minutes. You'll need a GitHub account, a Google account, and free accounts at [Supabase](https://supabase.com) and [Netlify](https://www.netlify.com).

Throughout, replace:
- `YOUR-SITE` with your Netlify address, for example `spawnpoint-maple.netlify.app` (or your own domain);
- `YOUR-PROJECT-REF` with your Supabase project reference (the random-looking part of your Supabase URL).

### 1. Fork the repo

On GitHub, click **Fork** to copy this repository into your account. Netlify will build from your fork.

### 2. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**.
2. Pick a name and a region near you. Choose a strong database password and save it in your password manager.
3. When the project is ready, open **Project Settings → API** (or **Project Settings → API Keys**) and note:
   - the **Project URL**: `https://YOUR-PROJECT-REF.supabase.co`;
   - the **anon / publishable** key (safe to put in the browser);
   - the **service_role / secret** key. Keep this one secret. It only ever goes into Netlify's environment variables.

### 3. Create the database tables

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), then from your fork's folder:

```sh
supabase login
supabase link --project-ref YOUR-PROJECT-REF   # asks for the database password
supabase db push                               # applies everything in supabase/migrations
```

Don't load `seed.sql` into your real project. It holds fictional demo households for local development.

### 4. Create a Google sign-in client

Spawnpoint signs people in with Google and asks only for their name and email (the basic `openid email profile` scopes).

1. Open the [Google Cloud console](https://console.cloud.google.com/) and create a new project (for example "Spawnpoint").
2. Go to **APIs & Services → OAuth consent screen** (in newer consoles this is **Google Auth Platform**). Click **Get started** and fill in:
   - **App name**: what people will see on the Google sign-in screen, for example "Spawnpoint".
   - **User support email**: your email.
   - **Audience**: **External**.
   - **Contact information**: your email.
3. Under **Branding → Authorized domains**, add `YOUR-PROJECT-REF.supabase.co` and your site's domain, for example `spawnpoint-xyz.netlify.app` or your own domain. Enter the full subdomain with no `https://`. Google rejects shared hosting domains like `supabase.co` or `netlify.app` on their own ("must be a top private domain").
   - Skip the app logo. Uploading one triggers a Google review you don't need.
4. Under **Data access**, add only the three basic scopes: `openid`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile`. Don't add anything else.
5. Under **Audience**, click **Publish app** so the **Publishing status** reads **In production**. Because you only use basic scopes, Google doesn't require verification. (While it's in "Testing", only test users you list can sign in.)
6. Go to **Clients** (or **Credentials → Create credentials → OAuth client ID**):
   - **Application type**: Web application.
   - **Authorized JavaScript origins**: `https://YOUR-SITE`
   - **Authorized redirect URIs**, exactly: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
7. Click **Create** and copy the **Client ID** and **Client secret**.

### 5. Turn on Google in Supabase

1. In Supabase, open **Authentication → Sign In / Providers** (older dashboards: **Authentication → Providers**).
2. Open **Google**, switch it on, and paste the Client ID and Client secret. Save.
3. Turn **Email** off, so Google is the only way in.
4. Open **Authentication → URL Configuration**:
   - **Site URL**: `https://YOUR-SITE`
   - **Redirect URLs**: add `https://YOUR-SITE/auth/callback`

Anyone can finish Google sign-in, but the app only lets people in who have an invite. Everyone else sees a friendly "you'll need an invite" screen.

### 6. Deploy to Netlify

1. In Netlify, click **Add new site → Import an existing project → GitHub** and pick your fork. The build settings come from `netlify.toml`, so leave them as they are.
2. Before (or right after) the first deploy, open **Site configuration → Environment variables** and add:

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the anon / publishable key |
   | `SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key. Mark it **secret** and limit its scope to **Functions**. |
   | `OPERATOR_EMAILS` | your Google email. For several operators, separate them with commas. |
   | `OPERATOR_NAME` | your name or nickname, shown on the Privacy page as who runs this copy |
   | `HOUSEHOLD_CREATION` | `invite_only` (recommended), or `open` to let anyone start a household |
   | `HOUSEHOLD_STORAGE_MB` | `250`, the per-household file quota |
   | `SITE_URL` | `https://YOUR-SITE` |

3. Trigger a deploy (**Deploys → Trigger deploy**). Variables starting with `VITE_` are baked in at build time, so redeploy whenever you change them.
4. If you use your own domain, add it under **Domain management**, then update the Google client (origins) and Supabase (Site URL and Redirect URLs) to match.

### 7. Make yourself the operator and send your first invite

1. Open `https://YOUR-SITE` and sign in with Google using an email listed in `OPERATOR_EMAILS`.
   - The app copies `OPERATOR_EMAILS` and the other settings into the database on sign-in. You can also trigger this by opening `https://YOUR-SITE/.netlify/functions/sync-config`.
   - If that doesn't work, run this in the Supabase **SQL Editor**: `insert into private.operators (email) values ('you@gmail.com');`
2. Open `https://YOUR-SITE/operator`. You'll see household and member counts and storage sizes. You can't see what's inside any household.
3. Click **New household invite**, give it a label (just for you), and copy the link. Invite links look like `https://YOUR-SITE/start/ABCD2345EFGH`. They work once and expire in 14 days.
4. To start your own household, open that link yourself. The setup wizard walks you through it and ends with a link to invite your partner or housemates.
5. For friends who want their own household, send each of them their own `/start/` link.

### Supabase free tier

The free plan is plenty for a few households. Check [Supabase pricing](https://supabase.com/pricing) for current numbers. At the time of writing it includes:
- a 500 MB database and 1 GB of file storage;
- 5 GB of bandwidth and 50,000 monthly active users;
- two free projects per account.

**Free projects pause after about a week without any activity.** Anyone opening the app counts as activity. If a project does pause, restore it from the Supabase dashboard; no data is lost. Photos are compressed on the phone before upload, and `HOUSEHOLD_STORAGE_MB` keeps any one household from filling the bucket.

---

## Local development

You'll need Node 22, Docker, and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```sh
npm install
supabase start                 # local Postgres, Auth, Realtime, Storage (Docker)
cp .env.example .env.local     # then fill it in from `supabase status`
npm run dev                    # http://localhost:5173
```

In `.env.local`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `supabase status`, and set `VITE_DEV_EMAIL_LOGIN=true`. The sign-in screen then shows a dev-only email form (it never appears in production builds), and you can sign in as the fictional seed users with the password `spawnpoint-demo`:

| Email | Who |
|---|---|
| `alex@example.com` | Maple House owner, Classic theme |
| `sam@example.com` | Maple House member, Squad HQ theme |
| `jordan@example.com` | Unit 4B owner, apartment template |
| `operator@example.com` | demo operator, no household |

Sign in as Alex in one browser and Jordan in another to see that the two households are walled off. Sign in as Alex and Sam to see the same household in two themes.

To try the `sync-config` function locally, run the app with the [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`netlify dev`) instead of `npm run dev`. To try real Google sign-in locally, set the `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` variables and enable Google in `supabase/config.toml`.

Anything personal belongs in `supabase/seed.local.sql`, which is gitignored and loaded after `seed.sql`.

### Commands

```sh
npm run dev          # Vite dev server
npm run build        # production build
npm run typecheck    # tsc
npm run lint         # eslint
npm run format       # prettier
npm test             # Vitest unit tests
npm run test:db      # pgTAP tests (supabase test db, or a throwaway Postgres fallback)
npm run test:e2e     # Playwright smoke tests against a production build
npm run db:types     # regenerate src/lib/database.types.ts from the local database
npm run icons        # re-render PNG app icons from public/favicon.svg
supabase db reset    # re-run migrations and seed.sql
```

`npm run test:db` uses the running Supabase stack when there is one. Otherwise it starts a throwaway Postgres (15+, with the `pgtap` extension and `pg_prove`) and applies a small Supabase shim from `scripts/db/`.

### How it's put together

- **Frontend:** Vite, React 18, TypeScript (strict), Tailwind driven by theme tokens, TanStack Query, React Router, `vite-plugin-pwa`.
- **Backend:** Supabase Postgres with row-level security on every table, Google sign-in through Supabase Auth, and Realtime for live updates.
- **Server-side:** Netlify Functions, the only place the service role key is used.
- **Scheduling rules** live in pure functions in `src/modules/chores/logic.ts`, with thorough tests.
- **Privacy:** every household-owned row has a `household_id`, and policies built on `is_member_of()` keep households apart. The pgTAP suite in `supabase/tests/` proves it.

See `CLAUDE.md` for conventions, `docs/PLAN.md` for the build plan, and `docs/DECISIONS.md` for choices made along the way.

## Self-hosting for developers

Everything is standard Supabase and a static site, so you can host it elsewhere:

- **Database:** any Supabase project (hosted or [self-hosted](https://supabase.com/docs/guides/self-hosting)). Apply `supabase/migrations/` in order. Keep RLS on.
- **Frontend:** `npm run build` produces a static `dist/` folder. Serve it from any static host. Rewrite every unknown path to `/index.html`, and copy the security headers from `netlify.toml`.
- **Functions:** `netlify/functions/sync-config.ts` is a small standard `Request → Response` handler. Port it to your platform's serverless functions, or skip it and manage `private.operators` and `private.app_config` with SQL.
- **Auth:** configure Google as the only provider, with your own redirect URLs.

Never expose the service role key to the browser.
