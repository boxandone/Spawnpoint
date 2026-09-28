# Themes

Spawnpoint ships with 21 theme packs. Each pack changes more than color: typography, panel shapes, textures, effort icons, badge frames, level titles, the words the app uses, and how it celebrates.

- The household sets a **default theme**. Each member can pick their **own theme**, so people in one household can use the same data in different themes.
- The setup wizard and Personal settings show a **gallery** that previews the member's real Today screen in each theme.
- Every theme has a light and a dark mode.
- **Classic** is the default for new households.

## Original work only

Themes evoke a **genre or a feeling**, never a specific product. That's what keeps the public repo safe from takedowns.

**Allowed**
- General genre conventions: angled sci-fi panels, holographic foil, rink lines, parchment and wax seals, pixel borders, trail-difficulty shapes, loot-rarity colors, crop plots.
- Color palettes, as long as they aren't paired with a logo, mark, or team or product name.
- Generic vocabulary like mission, quest, shift, assist, hat trick, loot, sortie, harvest.
- Original avatars and illustrations drawn for this repo.

**Never**
- Names of games, leagues, teams, franchises, characters, or places inside those worlds, anywhere in the repo.
- Logos, emblems, mascots, character likenesses, or signature objects.
- Fonts made for a specific franchise, sounds or music from one, or UI screens copied layout for layout.
- Catchphrases, branded currency names, or branded mechanic names.

Each theme has its own "Avoid" list. If something would make a fan say "that's the logo from X", leave it out.

## How a theme is built

Each theme lives in `src/theme/themes/<id>/`:

| File | Contents |
|---|---|
| `theme.ts` | id, display name, description, fonts, feature flags, badge word, level titles |
| `tokens.css` | color and shape tokens under `[data-app-theme="<id>"]`, with a dark block |
| `copy.ts` | vocabulary overrides (see below). Missing keys fall back to Classic. |
| `patterns.ts` | background textures as small inline SVG or CSS gradients, never large images |
| `celebrate.ts` | the task-complete, badge-earned, level-up, and meter-full animations. Every one has a reduced-motion version. |
| `effort.tsx` | three icons for effort 1, 2, and 3 |
| `badge-frame.tsx` | the frame drawn around the universal badge glyphs, with bronze, silver, and gold variants |
| `hero.tsx` | decorative header art for Today and the tab headers (`today` and `tab` variants), drawn with tokens only, kept to one side and low contrast so headings stay readable |
| `avatars/` | 12 original avatar SVGs in the theme's style |

**Shared token names:** `--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-muted`, `--line`, `--primary`, `--primary-ink`, `--secondary`, `--accent`, `--success`, `--warning`, `--danger`, `--radius`, `--panel-cut`, `--panel-border`, `--shadow-press`, `--font-display`, `--font-body`, `--font-num`.

**Shared copy keys:** `app.today`, `task.singular`, `task.plural`, `task.complete`, `task.completeToast`, `task.waiting`, `task.skip`, `area.plural`, `member.singular`, `household.name`, `meter.name`, `meter.full`, `streak.name`, `stuff.name`, `plans.name`, `lists.toBuy`, `badge.singular`, `badge.plural`, `level.up`, `coins.name`, `shop.name`, `deed.logFix`.

Code never uses theme words directly. It calls `useCopy()('task.complete')`.

**Level titles:** six per theme, one for each level band (1, 5, 10, 20, 35, 50+). The level number is always shown next to the title ("Lv 20 · Captain"), so it means the same thing in every theme.

**Rules for every theme**
- Text contrast is at least 4.5:1 in both modes, and at least 3:1 for large display text. A test checks each theme's token pairs.
- Semantic colors (success, warning, danger) stay recognizable in every theme.
- Textures sit at 6% opacity or less behind text.
- All fonts are OFL-licensed and loaded through `@fontsource`.
- A theme may add one signature view (like a map or a binder) behind a feature flag. All data still has to be reachable through the standard views.

---

## 1. Classic

**The neutral default.** Clean, friendly, and calm.

- **Palette (light):** bg `#F6F7F9`, surface `#FFFFFF`, ink `#1E2430`, primary `#3B6FE0`, secondary `#22A38A`, accent `#F2A93B`
- **Palette (dark):** bg `#12161E`, surface `#1B212C`, primary `#6F98F2`
- **Type:** Nunito (display, 800), Nunito Sans (body)
- **Shapes:** 14px radius, soft shadows, no texture
- **Effort icons:** 1, 2, or 3 dots
- **Words:** Today · Task · Done · "Waiting since Mon" · Household · Weekly goal · Badges · Coins · Stuff · Plans
- **Titles:** Newcomer · Regular · Homebody · Keeper · Steward · Legend
- **Badge frame:** a simple rounded medal
- **Celebration:** small confetti burst; the weekly meter fills with a glow

## 2. Squad HQ

**Inspired by:** colorful hero-shooter game menus.
**Feel:** a pre-match lobby. Bright, energetic, a little sci-fi, and friendly rather than gritty.

- **Palette (light):** bg `#E9EEF5`, surface `#FFFFFF`, ink `#1C2433`, primary `#FF8A2A` (warm orange), secondary `#2F9BFF` (sky blue), accent `#FFD23F`
- **Palette (dark):** bg `#0F1A2B`, surface `#172538`, primary `#FF9A3D`, secondary `#56B0FF`
- **Type:** Chakra Petch (display, 700, uppercase with slight tracking), Nunito (body)
- **Shapes:**
  - Panels have a 14px clipped top-right corner (`clip-path`) and a thin light inner stroke.
  - The active tab indicator is a skewed (-8°) bar.
  - Buttons are chunky, with a 4px press shadow.
  - Background is faint diagonal stripes.
- **Effort icons:** 1 to 3 stacked chevrons
- **Words:** Briefing (Today) · Mission · "Mission complete" · Squad (household) · Hero (member) · Squad Charge (weekly meter) · "Charged!" · Commendations (badges) · Credits (coins) · Loadout (Stuff) · Ops (Plans)
- **Titles:** Recruit · Agent · Specialist · Veteran · Commander · Legend
- **Badge frame:** an angled shield plate with a chevron rank strip
- **Celebration:** radial light rays behind the meter, and "Charged!" slamming in with a small screen shake (off with reduced motion)
- **Avatars:** 12 original chibi heroes: a visor robot, a goggled fox, a hover drone, an armored turtle, and so on
- **Avoid:** any game's name or logo; hero names, silhouettes, or likenesses; role icons from any game; branded end-of-match highlight names; branded names for a hero's big move; franchise fonts.

## 3. Pocket Trainer

**Inspired by:** creature-collecting adventure games and handheld-console charm.
**Feel:** cheerful, rounded, a little pixel-art nostalgia.

- **Palette (light):** bg `#FFF8E7` (cream), surface `#FFFFFF`, ink `#2B2A33`, primary `#E8474C` (cherry), secondary `#3D7DD8`, accent `#FFCB3D`, extra `#4DB86A` (grass)
- **Palette (dark):** bg `#1E1B2B`, surface `#2A2640`, primary `#FF6B6F`
- **Type:** Fredoka (display, 600), Nunito (body), Pixelify Sans for small numbers and badges only
- **Shapes:**
  - Fully rounded pills, 3px ink outlines, and a stepped pixel shadow.
  - The background is a dotted grass texture.
  - Dialog sheets look like a text box with a blinking ▼ in the corner.
- **Effort icons:** 1 to 3 small sparkles
- **Words:** Areas are **Routes** ("Route 1: Kitchen"). Members are **Trainers**. Stuff is the **Field Guide**, where every item gets an entry number ("No. 014 · Router"). Completing a task says "Nice catch!" Coins are Tokens.
- **Titles:** Rookie Trainer · Explorer · Ace Trainer · Veteran · Expert · Champion
- **Badge frame:** a faceted gym-style pin in the badge's category color
- **Celebration:** a sparkle burst, plus the badge case filling in
- **Avatars:** 12 original round elemental creatures: leaf sprout, ember puff, droplet, spark bug, pebble, cloud, moth, snail, and more. Each must be clearly original and not resemble any existing creature.
- **Avoid:** red-and-white capture balls or anything shaped like one; any existing creature's likeness; type-matchup icons; franchise names, slogans, or "-dex" wording; franchise fonts; handheld console branding.

## 4. Rink Night

**Inspired by:** pro hockey arenas.
**Feel:** game night under the lights. Ice white, orange, black, and metallic gold.

- **Palette (light):** bg `#EEF3F7` (ice), surface `#FFFFFF`, ink `#111418`, primary `#F47A38` (orange), secondary `#111418`, accent `#B5985A` (metallic gold). Details use `#D9373F` (red line) and `#2B5FAE` (blue line).
- **Palette (dark):** bg `#0C0E11`, surface `#171A1F`, primary `#FF8A4C`, accent `#C9AE6E`
- **Type:** Saira Condensed (display, 700, scoreboard feel), Barlow (body), Saira Condensed with tabular numbers for stats
- **Shapes:**
  - Panels have large rounded corners like rink boards.
  - The weekly meter is a center-ice circle.
  - Dividers use thin red and blue lines.
  - A faint ice-scratch texture sits behind content.
  - Member badges show jersey numbers.
- **Effort icons:** 1 to 3 pucks
- **Words:** Tonight's Lineup (Today) · Shift (task) · "Goal!" (complete) · Assist (logging for someone else) · Hat trick (3 in a day) · Standings (weekly meter) · Roster (members) · Banners (badges) · Equipment Room (Stuff)
- **Titles:** Rookie · Grinder · Playmaker · Alternate Captain · Captain · Hall of Famer
- **Badge frame:** a hanging arena banner
- **Celebration:** a goal-light lamp glows and pulses red with a horn icon. Sound is off unless enabled.
- **Avatars:** 12 original skaters, goalies, and zamboni-style critters with jersey numbers
- **Avoid:** league and team names, logos, wordmarks, and mascots; masks or crests from any team; copies of real jersey designs.

## 5. Hardwood

**Inspired by:** pro basketball.
**Feel:** a maple court by day, an arena jumbotron at night.

- **Palette (light):** bg `#F4EBDD` (maple), surface `#FFFDF8`, ink `#1D1A17`, primary `#E4572E` (ball orange), secondary `#2C3E91` (court blue), accent `#F2C14E`
- **Palette (dark, arena):** bg `#15171F`, surface `#1F2230`, primary `#FF6A3D`, accent `#FFD166`
- **Type:** Anton (display), Work Sans (body), a dot-matrix treatment for big numbers in dark mode
- **Shapes:**
  - Wood-plank stripes from a repeating gradient at low opacity.
  - Panels use a court-key outline.
  - The weekly meter is a three-point arc.
- **Effort icons:** 1, 2, or 3 points (free throw, two, three)
- **Words:** Game Day (Today) · "Bucket!" (complete) · Scoreboard (weekly meter) · Double-double (10 tasks in a week) · Hot hand (streak) · Assist · Bench (skipped) · Rings (badges) · Locker Room (Stuff)
- **Titles:** Walk-on · Rotation Player · Starter · All-Star · Franchise Player · Hall of Famer
- **Badge frame:** a championship-ring face
- **Celebration:** the ball drops through a swishing net. After 10pm it's labeled "Buzzer beater".
- **Avatars:** 12 original players and ball-headed critters
- **Avoid:** league and team names, logos, and silhouette marks; team color schemes paired with city names.

## 6. Pack Pull

**Inspired by:** collecting trading cards (sports and creature cards alike).
**Feel:** opening a fresh pack. Holo foil, card sleeves, binder pages.

- **Palette (light):** bg `#F1EEF8` (lilac), surface `#FFFFFF`, ink `#221E33`, primary `#7B5CE0`, secondary `#1FB5A8`, foil gradient `#FF9AD5 → #9AD9FF → #FFE89A`
- **Palette (dark):** bg `#16131F`, surface `#221D30`, primary `#9D84FF`
- **Type:** Outfit (display), DM Sans (body), IBM Plex Mono for card numbers
- **Shapes:**
  - Grid views render tasks and items as cards in a 2.5:3.5 ratio, with an inner frame, a set symbol, and a number ("042/150").
  - Holo foil shimmer follows the pointer or device tilt (static with reduced motion).
  - **Signature view:** Stuff as a binder of 9-pocket pages.
- **Effort icons:** rarity symbols: circle (common), diamond (uncommon), star (rare)
- **Words:** Pull (complete) · Binder (Stuff) · Set (area) · Complete set (every task in an area done this week) · Graded slab (a finished Plan, shown in a "Mint 10" case) · Wantlist (To buy) · Cards (badges)
- **Titles:** Common · Uncommon · Rare · Holo Rare · Secret Rare · Gem Mint
- **Badge frame:** a mini card in a toploader, with gold getting full holo
- **Celebration:** on Sunday, a pack-opening flip reveals a card of your week's highlights
- **Avatars:** members appear as holo trading cards made from their avatar
- **Avoid:** real card company names and logos, grading company names, player or creature names, copies of real card templates.

## 7. Hangar Bay

**Inspired by:** giant-robot anime and model kits.
**Feel:** a maintenance hangar. Blueprints, hazard stripes, system readouts.

- **Palette (light):** bg `#E6ECF2`, surface `#FFFFFF`, ink `#0F1B2D`, primary `#1F5FD1` (blue), secondary `#D93A3A` (red), accent `#F6C343` (yellow). Hazard stripes are yellow and ink.
- **Palette (dark, the signature look):** bg `#0A1628` with a blueprint grid, surface `#10233D`, primary `#4C8DFF`, line `#3E6FA8`
- **Type:** Exo 2 (display, 700), Barlow (body), Share Tech Mono for readouts and IDs
- **Shapes:**
  - All four panel corners are chamfered, with a panel ID in one corner ("BAY-03").
  - Section dividers are hazard stripes.
  - The weekly meter is a gauge dial.
  - The background is a blueprint grid.
- **Effort icons:** 1 to 3 power cells
- **Words:** Hangar (Today) · Work order (task) · "Sortie clear" (complete) · "Awaiting maintenance" (waiting) · Pilots (members) · Bays (areas) · Parts inventory (Stuff) · Operations (Plans) · Reactor output (weekly meter) · Insignia (badges)
- **Titles:** Cadet · Pilot · Ace Pilot · Squadron Lead · Commander · Hangar Legend
- **Badge frame:** a stenciled unit patch with rivets
- **Celebration:** a scan line sweeps the screen and "ALL SYSTEMS GREEN" boots up
- **Avatars:** 12 original pilot helmets and small original robots
- **Avoid:** franchise names, faction emblems, and model numbers; recognizable robot designs, especially signature head crests or antennae; series fonts or title treatments.

## 8. Drop Zone

**Inspired by:** cartoony battle-royale games.
**Feel:** a bright sky-dive lobby. Chunky, bouncy, sticker-like.

- **Palette (light):** bg `#EAF0FF`, surface `#FFFFFF`, ink `#1A1633`, primary `#7A3CFF` (purple), secondary `#00C2FF` (cyan), accent `#FFD500`. The loot ladder is gray `#9AA3B2`, green `#3BB54A`, blue `#2F80ED`, purple `#9B51E0`, gold `#F2A93B`.
- **Palette (dark):** bg `#120E2A`, surface `#1D1740`, primary `#9C6BFF`
- **Type:** Lilita One (display), Nunito (body)
- **Shapes:**
  - Slanted chunky buttons with thick outlines and a sticker drop shadow.
  - A sky-gradient header with drifting clouds.
- **Effort icons:** loot-rarity colored gems (common to rare)
- **Words:** Drop In (Today) · "Cleared!" (complete) · Loot list (To buy) · Squad (household) · Season level (weekly meter) · Emblems (badges) · Locker (Stuff)
- **Titles:** Rookie · Scout · Looter · Squad Leader · Elite · Legendary
- **Badge frame:** a sticker with a thick white outline, tinted by loot rarity
- **Celebration:** a loot-drop light beam in the task's effort color
- **Avatars:** 12 original chunky cartoon characters in outfits and costumes
- **Avoid:** the game's name, branded win phrases, vehicle or mascot likenesses (buses, llamas and so on), branded season-pass names, franchise fonts.

## 9. Quest Journal

**Inspired by:** fantasy MMOs.
**Feel:** an adventurer's journal. Parchment, ink, wax seals, a map of your home.

- **Palette (light):** bg `#F3E9D2` (parchment), surface `#FBF4E2`, ink `#2A2117`, primary `#B0332C` (crimson wax), secondary `#2F6B5E` (jade), accent `#C8962E` (gold leaf)
- **Palette (dark, tavern):** bg `#17130E`, surface `#231C14`, primary `#D9534A`, accent `#E0B04F`
- **Type:** Cinzel (display), Alegreya (body), Alegreya Sans for small UI text
- **Shapes:**
  - Inked borders with corner flourishes drawn as SVG.
  - Badges are wax seals.
  - **Signature view:** a map of the house where each area is a region with its completion percentage.
- **Effort icons:** 1 to 3 gems
- **Words:** Quest Log (Today) · Dailies and Weeklies · "Quest complete" · Party (members) · Regions (areas) · Achievements (badges) · Gold (coins) · Bags (Stuff) · Expeditions (Plans) · Map completion (weekly meter)
- **Titles:** Novice · Adventurer · Knight · Champion · Hero · Legend
- **Badge frame:** a wax seal pressed onto a ribbon
- **Celebration:** a scroll unrolls with an achievement banner. There's a soft chime if sound is on.
- **Avatars:** 12 original adventurer critters: a knight hedgehog, a mage owl, a ranger fox, and so on
- **Avoid:** game names, world or place names, race or faction names and emblems, recognizable map icons or quest markers from any game, branded crafting-system names.

## 10. Passport

**Inspired by:** travel.
**Feel:** a well-used passport. Paper, rubber stamps, boarding passes. This is where the Plans module shines.

- **Base palette (light):** bg `#F7F3EA` (paper), surface `#FFFFFF`, ink `#1F2A36`, primary `#1F4E79` (passport navy)
- **Base palette (dark):** bg `#101820`, surface `#1A2530`, primary `#6FA3D6`
- **Type:** DM Serif Display (display), Karla (body), Courier Prime for ticket stubs and codes
- **Shapes:**
  - Ticket-stub cards with perforated edges.
  - Completions stamp as round rubber stamps, slightly rotated.
  - Plans with dates look like boarding passes with a countdown.
- **Destination variants:** each member picks one. A variant swaps the accent colors and background pattern.
  - **Bangkok:** temple gold `#D4A017`, lacquer red `#B3261E`, lotus pattern
  - **Kyoto:** indigo `#26407A`, sakura `#F2A7B8`, washi texture with a wave pattern
  - **Hawaii:** ocean teal `#0E9AA7`, hibiscus `#E94B6A`, palm-leaf pattern
  - **Monterey:** fog `#C9D2D6`, kelp `#3E6B48`, otter brown `#7A5A43`, cypress silhouettes
  - **Texas:** sunset `#E0663A`, sage `#8FA58A`, big-sky blue `#4A90C2`, a lone-star motif
- **Effort icons:** 1 to 3 stamps
- **Words:** Itinerary (Today) · "Stamped!" (complete) · Destinations (areas) · Miles (weekly meter) · Travelers (members) · Stamps (badges) · Luggage (Stuff) · Trips (Plans)
- **Titles:** Day-tripper · Traveler · Voyager · Globetrotter · Explorer · World Citizen
- **Badge frame:** a round or oval passport stamp
- **Celebration:** a stamp thunks down with a small ink splatter
- **Avoid:** airline, hotel, or tourism-board logos; real passport seals or national emblems.

## 11. Powder Day

**Inspired by:** snowboarding.
**Feel:** a bluebird day at the mountain. Crisp white, glacier blue, safety orange.

- **Palette (light):** bg `#F2F7FB` (snow), surface `#FFFFFF`, ink `#10202E`, primary `#1976D2` (glacier), secondary `#FF5A36` (safety orange), accent `#7EE0FF`. Trail colors are green `#2E9E4F`, blue `#1F5FD1`, and black `#111111`.
- **Palette (dark, night riding):** bg `#0B1622`, surface `#13233A`, primary `#5AA8FF`
- **Type:** Rubik (display, 700), Figtree (body)
- **Shapes:**
  - An SVG mountain ridgeline across the header.
  - Member badges look like lift tickets, with a zip-tie hole.
  - Light ambient snowfall (off with reduced motion).
- **Effort icons:** trail difficulty: green circle, blue square, black diamond
- **Words:** Today's Runs (Today) · "Sent it!" (complete) · Vertical (weekly meter, in feet) · Powder days (streak) · Crew (members) · Pins (badges) · Gear Room (Stuff) · Trips (Plans)
- **Titles:** Bunny Hill · Green Circle · Blue Square · Black Diamond · Double Black · Backcountry Legend
- **Badge frame:** an enamel pin in a mountain shape
- **Celebration:** a spray of snow across the task card
- **Avatars:** 12 original riders and critters in goggles and beanies
- **Avoid:** resort names and logos, gear brand names and logos.

## 12. Night Market

**Inspired by:** food, and the street food of Thailand and Japan.
**Feel:** paper lanterns and chili oil, a bento box of today's tasks. Dark mode is the signature look.

- **Palette (light):** bg `#FFF4E6` (lantern paper), surface `#FFFFFF`, ink `#2B1D14`, primary `#E03E2D` (chili), secondary `#F2A93B` (mango), accent `#3FA37C` (pandan)
- **Palette (dark):** bg `#1A1218`, surface `#261B24`, primary `#FF5A45`, lantern glow `#FFB347`
- **Type:** Baloo 2 (display), Nunito (body)
- **Shapes:**
  - Today is a **bento grid**, with one compartment per area.
  - Lists look like receipts or order tickets.
  - Headers have hanging lanterns that glow softly in dark mode.
  - A little steam rises from a completed bowl (off with reduced motion).
- **Effort icons:** 1 to 3 chilies
- **Words:** Today's Menu (Today) · Order (task) · "Order up!" (complete) · Stalls (areas) · Punch card (weekly meter) · Stickers (badges) · Pantry (Stuff)
- **Titles:** Taster · Regular · Line Cook · Sous Chef · Head Chef · Street Food Legend
- **Badge frame:** a round food-stall sticker
- **Celebration:** a punch-card hole punch, and a full card spins
- **Avatars:** 12 original food critters: dumpling, rice ball, mango sticky rice, boba, taco, and so on
- **Avoid:** restaurant or brand logos, and existing food mascots.

## 13. Campfire

**Inspired by:** cozy camping.
**Feel:** plaid blankets, lantern light, and s'mores after the chores are done.

- **Palette (light):** bg `#F4EDE1` (canvas), surface `#FFFBF3`, ink `#2B211A`, primary `#C8553D` (ember), secondary `#2F5D50` (pine), accent `#E8A33D` (lantern)
- **Palette (dark, night camp):** bg `#16120F`, surface `#221B16`, primary `#F07A4E`, glow `#FFB54A`
- **Type:** Zilla Slab (display, 700), Nunito (body)
- **Shapes:**
  - Stitched dashed borders like canvas seams.
  - A buffalo-plaid stripe across the header.
  - The weekly meter is a tent, and a campfire at its base grows as the week fills.
- **Effort icons:** 1 to 3 logs
- **Words:** Camp (Today) · Camp chores (tasks) · "Log on the fire" (complete) · Campers (members) · Campsites (areas) · Patches (badges) · Gear Tent (Stuff) · Trips (Plans)
- **Titles:** Tenderfoot · Camper · Trail Cook · Firekeeper · Camp Counselor · Old Timer
- **Badge frame:** an embroidered round patch with a stitched edge
- **Celebration:** the fire flares up with rising sparks
- **Avatars:** 12 original critters in beanies and flannel: raccoon, bear cub, fox, owl, and so on
- **Avoid:** outdoor brand logos; scouting organization names, emblems, and badge designs.

## 14. Trailhead

**Inspired by:** hiking and the outdoors.
**Feel:** a trail map. Topo lines, trail blazes, earth tones.

- **Palette (light):** bg `#EEF0E6`, surface `#FFFFFF`, ink `#1F2A22`, primary `#3E7B4F` (forest), secondary `#C46A2B` (clay), accent `#E3B23C` (goldenrod)
- **Palette (dark):** bg `#111811`, surface `#1B241C`, primary `#6FB07F`
- **Type:** Signika (display, 700), Source Sans 3 (body)
- **Shapes:**
  - A topographic contour-line texture.
  - Trail-blaze markers on list items.
  - The weekly meter is an elevation profile with a summit flag.
- **Effort icons:** 1 to 3 mountain peaks
- **Words:** Trail Report (Today) · Trails (areas) · "Summited!" (complete) · Miles hiked (weekly meter) · Hikers (members) · Trail markers (badges) · Pack (Stuff) · Expeditions (Plans)
- **Titles:** Day Hiker · Trail Walker · Ridge Runner · Summiteer · Pathfinder · Trail Legend
- **Badge frame:** a carved wooden trail marker
- **Celebration:** a dotted trail line draws itself to a summit flag
- **Avatars:** 12 original hikers and forest animals with packs
- **Avoid:** park agency logos and arrowhead marks, trail organization names, gear brand logos.

## 15. Command Center

**Inspired by:** mission control and ops dashboards.
**Feel:** a calm, dark console. Status lights, readouts, everything under control. Dark mode is the signature look.

- **Palette (dark, default):** bg `#07121C`, surface `#0E1D2B`, ink `#D6E6F2`, primary `#2EE6A6` (status green), secondary `#3FA9FF`, accent `#FFB020` (amber), line `#1F3A52`
- **Palette (light):** bg `#EEF3F7`, surface `#FFFFFF`, ink `#0E1A26`, primary `#0F9D6E`, secondary `#1F6FD1`, accent `#D98A00`
- **Type:** IBM Plex Sans Condensed (display), IBM Plex Sans (body), JetBrains Mono for numbers and IDs
- **Shapes:**
  - Console panels with a header bar and a status light in the corner.
  - Small sparklines on area cards.
  - A dense grid layout on wide screens.
  - A very faint scanline texture in dark mode.
- **Effort icons:** 1 to 3 signal bars
- **Words:** Ops Board (Today) · Tickets (tasks) · "Resolved" (complete) · "Open since Mon" (waiting) · Operators (members) · Sectors (areas) · Commendations (badges) · Asset Registry (Stuff) · Projects (Plans) · Uptime (weekly meter, shown as %)
- **Titles:** Operator · Analyst · Engineer · Lead · Director · Mission Control
- **Badge frame:** a hexagonal chip with a status light
- **Celebration:** every status light turns green, and "ALL CLEAR" types out
- **Avatars:** 12 original headset-wearing operators and small robots
- **Avoid:** space agency logos and mission names, real company dashboards copied layout for layout.

## 16. Good Dog

**Inspired by:** dogs.
**Feel:** happy, bouncy, tail-wagging. Every task is a good job.

- **Palette (light):** bg `#FFF6EC`, surface `#FFFFFF`, ink `#2E2118`, primary `#E07A2F` (collar orange), secondary `#3C8DBC` (sky), accent `#C9E265` (tennis ball)
- **Palette (dark):** bg `#1C1612`, surface `#2A211B`, primary `#FF9448`
- **Type:** Chewy (display), Nunito (body)
- **Shapes:**
  - Member badges are dog-tag shaped.
  - A faint paw-print trail texture.
  - Progress bars have rounded bone-shaped ends.
  - The weekly meter is a tennis ball that fills with color.
- **Effort icons:** 1 to 3 paw prints
- **Words:** Walk Time (Today) · Tricks (tasks) · "Good job!" (complete) · Pack (household) · Pups (members) · Sniff Spots (areas) · Treats (coins) · Tags (badges) · Toy Box (Stuff) · Walks (streak)
- **Titles:** Puppy · Good Pup · Best Friend · Top Dog · Pack Leader · Legendary Good Dog
- **Badge frame:** a bone-shaped or round dog tag
- **Celebration:** the card does a tail-wag wiggle with a burst of paw-print confetti
- **Avatars:** 12 original cartoon dogs of different breeds
- **Avoid:** famous cartoon or comic dogs, pet brand logos and mascots.

## 17. Cat Nap

**Inspired by:** cats.
**Feel:** soft, pastel, and sleepy. Sunbeams and yarn.

- **Palette (light):** bg `#F7F1F6` (pastel blush), surface `#FFFFFF`, ink `#2C2433`, primary `#C0679A` (berry), secondary `#6F9FD8` (periwinkle), accent `#F4C95D` (sunbeam)
- **Palette (dark):** bg `#17131C`, surface `#231C2A`, primary `#E28CBC`
- **Type:** Quicksand (display, 700), Nunito (body)
- **Shapes:**
  - Very soft, round corners.
  - Two small cat-ear notches on top of feature panels.
  - Yarn-strand dividers.
  - A warm sunbeam gradient across the top of Today.
- **Effort icons:** 1 to 3 yarn balls
- **Words:** Nap Schedule (Today) · "Purr-fect" (complete) · Clowder (household) · Cats (members) · Nap Spots (areas) · Treats (coins) · Bells (badges) · Treasure Stash (Stuff) · Sunbeams (streak)
- **Titles:** Kitten · House Cat · Sunbeam Seeker · Windowsill Watcher · Head of Household · Supreme Floof
- **Badge frame:** a round collar bell charm
- **Celebration:** a pair of eyes does a slow blink, followed by a soft purr ripple across the card
- **Avatars:** 12 original cartoon cats of different coats and shapes
- **Avoid:** famous cartoon cats (including any white kitty with a bow), cat food and litter brand logos.

## 18. Sunny Acres

**Inspired by:** bright, cartoony farming games.
**Feel:** a sunny farm. Every task is a crop you get to harvest.

- **Palette (light):** bg `#F2F9E8`, surface `#FFFFFF`, ink `#23301C`, primary `#5DAA3A` (grass), secondary `#F28C28` (pumpkin), accent `#FFD447` (sun), sky `#7CC6F2`
- **Palette (dark, night farm):** bg `#141C12`, surface `#1E2A1B`, primary `#7FCC5B`
- **Type:** Luckiest Guy (display), Nunito (body)
- **Shapes:**
  - Panels have a picket-fence top edge.
  - A red barn icon anchors the header.
  - **Signature view:** Today as a grid of crop plots, one per task. A plot grows from seed to sprout to ripe as its due date nears, and gets harvested on completion.
- **Effort icons:** a seed, a sprout, and a full crop
- **Words:** The Farm (Today) · Plots (areas) · "Harvested!" (complete) · Farmhands (members) · Ribbons (badges) · Barn (Stuff) · Market (To buy) · Harvest meter (weekly meter)
- **Titles:** Seedling · Sprout · Farmhand · Grower · Rancher · Harvest Legend
- **Badge frame:** a county-fair prize ribbon
- **Celebration:** the crop pops out of the ground and coins bounce up
- **Avatars:** 12 original farm animals and farmers
- **Avoid:** game names, branded currencies, recognizable mascot animals or art style copies.

## 19. Hearthfield

**Inspired by:** cozy pixel-art farming and life sims.
**Feel:** a quiet farm through the seasons. Pixel art, wood signs, a shipping bin at the end of the day.

- **Palette (light):** bg `#F5E9CF`, surface `#FFF6E0`, ink `#3B2A1A`, primary `#3F8F3A` (leaf), secondary `#C0602B` (clay), accent `#F2C14E`
- **Seasonal accent** (follows the real calendar): spring `#F29BB8`, summer `#F2C14E`, fall `#D9772B`, winter `#7FB2D9`
- **Palette (dark):** bg `#1B1712`, surface `#2A2219`, primary `#6FBF5B`
- **Type:** Pixelify Sans (display), Nunito (body)
- **Shapes:**
  - Pixel-art borders built with stepped CSS.
  - Wooden sign headers.
  - A calendar strip showing the season and day ("Fall 26").
  - The weekly meter is a shipping bin that fills as tasks are "shipped".
- **Effort icons:** 1 to 3 pixel crops
- **Words:** Today on the Farm (Today) · "Shipped!" (complete) · Farmers (members) · Fields (areas) · Honors (badges) · Gold (coins) · Chest (Stuff) · Bulletin Board (Plans and To-do) · Seasons (quarterly seasons)
- **Titles:** Newcomer · Villager · Homesteader · Farmer · Master Farmer · Valley Legend
- **Badge frame:** a pixel-art star plaque on wood
- **Celebration:** an end-of-day "shipped" tally that counts up item by item
- **Avatars:** 12 original pixel-art farmers and farm animals
- **Avoid:** game names; town, place, or character names; forest-spirit creatures resembling any game's; game fonts, music, or sprites.

## 20. Island Days

**Inspired by:** cozy island life-sim games.
**Feel:** a slow, sunny island that gets a little nicer every day. Soft pastels and speech bubbles.

- **Palette (light):** bg `#EAF7F1` (seafoam), surface `#FFFDF5`, ink `#3A3226`, primary `#3DB39E` (teal), secondary `#F2B84B` (sunny), accent `#F28CA6` (peach-pink), sand `#F3E3C0`
- **Palette (dark, starry island night):** bg `#0F1E1C`, surface `#1A2C29`, primary `#5FD3BD`
- **Type:** M PLUS Rounded 1c (display, 800), Nunito (body)
- **Shapes:**
  - Very rounded corners throughout.
  - Toasts are speech bubbles with a typewriter text reveal.
  - Shell and starfish motifs (never leaves as a main icon).
  - **Signature view:** Areas as spots on an island map. Each spot gets flowers and decorations as its freshness goes up.
- **Effort icons:** 1 to 3 seashells
- **Words:** "Good morning!" (Today) · Island (household) · Islanders (members) · Spots (areas) · "Nice work!" (complete) · Shells (coins) · Stickers (badges) · Pockets (Stuff) · Island rating (weekly meter, 1 to 5 stars)
- **Titles:** Newcomer · Islander · Neighbor · Local · Island Planner · Island Legend
- **Badge frame:** a round sticker with a scalloped edge
- **Celebration:** fireworks over the island map, and the star rating ticks up
- **Avatars:** 12 original animal islanders in a felt-craft style, clearly different from any game's villagers
- **Avoid:** game names; the leaf logo or leaf-shaped icons; any character likeness (shopkeepers, raccoons, dodos, and so on); branded currency names; game fonts or music.

## 21. Block Party

**Inspired by:** voxel sandbox building games.
**Feel:** a blocky world you build up one task at a time. Chunky pixel textures, bright sky by day, a starry sky by night.

- **Palette (light, daytime):** bg `#DCEFFB` (sky), surface `#FFFFFF`, ink `#1E1A16`, primary `#5FA83A` (grass), secondary `#8B5A2B` (dirt), accent `#9A5CC6` (amethyst), stone `#7D7D7D`
- **Palette (dark, night):** bg `#0E1426`, surface `#1A2238`, primary `#6CC04A`, accent `#B88AE6`
- **Day and night:** the header sky follows the household's real time of day, with a sun during the day and a moon and stars at night. With reduced motion it switches without animating.
- **Type:** Silkscreen (display, short labels only), Nunito (body), Pixelify Sans for numbers
- **Shapes:**
  - Square corners everywhere (radius 0).
  - Beveled pixel edges: a light inset highlight on the top and left, a dark one on the bottom and right.
  - Panels and buttons use original 16×16 pixel textures (grass-topped dirt, stone, wood planks, brick), drawn for this repo as tiny inline SVGs.
  - **Signature view:** the weekly meter is a little build. Each completed task places a block, and over a week the blocks stack into a house. A full season's builds form a small village on the Me page.
- **Effort icons:** a dirt block, a stone block, and an amethyst ore block
- **Words:** Today's Build (Today) · Jobs (tasks) · "Placed!" (complete) · Builders (members) · Biomes (areas) · Gems (coins) · Trophies (badges) · Chest (Stuff) · Blueprints (Plans) · Build meter (weekly meter)
- **Titles:** Dirt Digger · Stone Stacker · Brick Builder · Architect · Master Builder · World Shaper
- **Badge frame:** a square beveled item-frame tile
- **Celebration:** the block pops into place with a burst of square pixel particles
- **Avatars:** 12 original blocky critters and builders (a cube cat, a boxy bee, a mushroom cube, a robot, and so on)
- **Avoid:** the game's name or logo; any character or mob likeness, especially square-headed people in teal shirts, green four-legged explosive creatures, or tall dark teleporting figures; the diamond pickaxe or other signature tools; copies of the game's block textures, UI panels, inventory or crafting grids, or green segmented experience bar; game fonts, sounds, or music; branded terms for the game's achievements or editions.

---

## Build order

1. **Phase 0:** the theme engine (tokens, `useCopy`, celebrate, effort, badge frames, level titles, per-member override, gallery preview), **Classic**, and **Squad HQ**, plus a theme switcher on `/styleguide`.
2. **Phase 6:** the remaining 19 themes, one per commit, in this order: Rink Night, Block Party, Hearthfield, Cat Nap, Good Dog, Pocket Trainer, Quest Journal, Island Days, Sunny Acres, Night Market, Passport, Campfire, Trailhead, Powder Day, Hardwood, Pack Pull, Hangar Bay, Drop Zone, Command Center. Each theme adds a styleguide screenshot to `docs/themes/` and passes the contrast test.
