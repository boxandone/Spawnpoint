/**
 * Patch notes shown on the "What's new" page, newest first.
 *
 * When you ship a user-visible change: bump "version" in package.json and add
 * an entry here with the same version (a test checks they match). Keep notes
 * short, plain, and free of theme vocabulary: they show in every theme.
 */
export type ChangeKind = 'new' | 'improved' | 'fixed';

export interface Release {
  version: string;
  /** ISO date the release shipped. */
  date: string;
  title: string;
  changes: Array<{ kind: ChangeKind; text: string }>;
}

export const RELEASES: readonly Release[] = [
  {
    version: '0.6.0',
    date: '2026-09-27',
    title: 'Stuff: your home inventory',
    changes: [
      {
        kind: 'new',
        text: 'Stuff: keep track of what you own and where it lives, down to the shelf. “Where is…” finds anything by name, tag, brand, or place.',
      },
      {
        kind: 'new',
        text: 'Add photos, receipts, manuals, and warranties to any item, or to Household papers. Photos are shrunk on your phone, and files stay private to your household.',
      },
      {
        kind: 'new',
        text: 'Warranties ending in the next 60 days show at the top of Stuff.',
      },
      {
        kind: 'new',
        text: 'QR labels: print a sheet for bins, shelves, and things. Scanning one opens what’s inside, for your household only.',
      },
      {
        kind: 'new',
        text: 'The Scan button reads our labels and product barcodes.',
      },
      {
        kind: 'new',
        text: 'Bought something on your To buy list? Add it to Stuff in one tap, with the details filled in.',
      },
      {
        kind: 'improved',
        text: 'Area pages show what’s stored there, and you can add spots like “Cabinet 2”.',
      },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-09-27',
    title: 'Lists: groceries, to buy, and to-do',
    changes: [
      {
        kind: 'new',
        text: 'Groceries: add items in a tap and they’re sorted into aisles on their own. Switch to Store to shop by aisle, then tap Done shopping.',
      },
      {
        kind: 'new',
        text: 'Staples: the things you buy every week, back on the list with one tap. Past purchases show up as suggestions while you type.',
      },
      {
        kind: 'new',
        text: 'To buy: keep ideas and planned purchases with a price, links, priority, and where it goes.',
      },
      {
        kind: 'new',
        text: 'To-do: household to-dos with a due date, who’s on it, and a “talk it over” flag.',
      },
      {
        kind: 'new',
        text: 'Make your own lists, like a packing list or gift ideas.',
      },
      {
        kind: 'new',
        text: 'Swipe an item right to check it off or left to remove it, and drag to reorder. Changes show up on everyone’s phone.',
      },
      {
        kind: 'fixed',
        text: 'Moving straight between some settings pages could show the wrong page.',
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-09-27',
    title: 'Levels, badges, and a reward shop',
    changes: [
      {
        kind: 'new',
        text: 'Finishing tasks now earns XP and levels. Your level, XP, and coins are private to you.',
      },
      {
        kind: 'new',
        text: 'Badges for good deeds and milestones, with bronze, silver, and gold tiers. Once earned, a badge is yours to keep.',
      },
      {
        kind: 'new',
        text: 'Log a fix: record a good deed that wasn’t on the list, from the wrench button on Today.',
      },
      {
        kind: 'new',
        text: 'Coins and a household reward shop. Owners add rewards, and anyone can spend their own coins. Undo within 10 minutes.',
      },
      {
        kind: 'new',
        text: 'Seasons: ten goals each quarter. Finish five for that season’s badge.',
      },
      {
        kind: 'new',
        text: 'A household feed of shared celebrations. Choose whether your new badges show there in Settings.',
      },
      {
        kind: 'new',
        text: 'Make a share card with your level and top badges.',
      },
      {
        kind: 'improved',
        text: 'The weekly meter on Today now counts the household’s earned XP.',
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-27',
    title: 'Help, tips, and a quick dark mode switch',
    changes: [
      {
        kind: 'new',
        text: 'Help: answers to common questions, from logging yesterday’s tasks to installing the app.',
      },
      {
        kind: 'new',
        text: 'Report a bug, ask a question, or suggest an idea. It goes privately to whoever runs this site, and you can see their reply.',
      },
      {
        kind: 'new',
        text: 'Guide mode: small tips on the screens where they help. Turn it off or bring every tip back in Help.',
      },
      {
        kind: 'improved',
        text: 'Switch between system, light, and dark with one tap at the top of Me.',
      },
    ],
  },
  {
    version: '0.2.1',
    date: '2026-09-27',
    title: 'Clearer invites for operators',
    changes: [
      { kind: 'improved', text: 'Operators can rename household invite labels.' },
      {
        kind: 'improved',
        text: 'A used household invite shows which household it became, as a short id.',
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-27',
    title: 'Privacy, terms, and what’s new',
    changes: [
      {
        kind: 'new',
        text: 'A “What’s new” page (you’re reading it) with a dot on Me when there’s an update.',
      },
      { kind: 'new', text: 'Privacy and Terms pages, linked from the sign-in screen and Me.' },
      { kind: 'improved', text: 'The app version now shows at the bottom of Me.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-27',
    title: 'Hello, household',
    changes: [
      { kind: 'new', text: 'Sign in with Google and join by invite link.' },
      { kind: 'new', text: 'Set up your home: areas, starter tasks, and a theme for everyone.' },
      {
        kind: 'new',
        text: 'Today: tap to finish a task, long-press for another day, another person, or skip. Every check-off can be undone.',
      },
      { kind: 'new', text: '“What got done?” to catch up on the past week in one go.' },
      {
        kind: 'new',
        text: 'Areas with freshness bars, Upcoming for the next 7 days, and History.',
      },
      { kind: 'new', text: 'Zone rotation: give each weekday an area.' },
      {
        kind: 'new',
        text: 'Two themes, Classic and Squad HQ, each in light and dark. Everyone can pick their own.',
      },
      { kind: 'new', text: 'Live updates: when someone checks something off, everyone sees it.' },
    ],
  },
];

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

export const LATEST: Release = RELEASES[0] as Release;

/** Compares "1.10.0" > "1.9.2" correctly. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
