/** Every TanStack Query key in one place, so realtime can invalidate precisely. */
export const qk = {
  membership: (userId: string | undefined) => ['membership', userId] as const,
  publicConfig: ['publicConfig'] as const,
  isOperator: (userId: string | undefined) => ['isOperator', userId] as const,
  operatorStats: ['operatorStats'] as const,
  invites: (kind: 'member' | 'household') => ['invites', kind] as const,
  locations: (hid: string) => ['locations', hid] as const,
  tasks: (hid: string) => ['tasks', hid] as const,
  completions: (hid: string) => ['completions', hid] as const,
  history: (hid: string) => ['history', hid] as const,
  // Rewards: the caller's own, plus household-wide feed and meter.
  myRewards: (mid: string) => ['rewards', 'me', mid] as const,
  myBadges: (mid: string) => ['rewards', 'badges', mid] as const,
  shop: (mid: string) => ['rewards', 'shop', mid] as const,
  feed: (hid: string) => ['feed', hid] as const,
  weekXp: (hid: string) => ['weekXp', hid] as const,
  deedLogs: (hid: string) => ['deedLogs', hid] as const,
  // Lists
  lists: (hid: string) => ['lists', hid] as const,
  listItems: (hid: string) => ['listItems', hid] as const,
  staples: (hid: string) => ['staples', hid] as const,
  grocerySuggestions: (hid: string) => ['grocerySuggestions', hid] as const,
  // Stuff
  items: (hid: string) => ['items', hid] as const,
  documents: (hid: string) => ['documents', hid] as const,
  shortCodes: (hid: string) => ['shortCodes', hid] as const,
  signedUrls: (paths: readonly string[]) => ['signedUrls', ...paths] as const,
  // Plans and calendar
  plans: (hid: string) => ['plans', hid] as const,
  checklist: (hid: string) => ['checklist', hid] as const,
  discussions: (hid: string) => ['discussions', hid] as const,
  icsToken: (mid: string) => ['icsToken', mid] as const,
};
