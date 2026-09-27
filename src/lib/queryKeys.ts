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
};
