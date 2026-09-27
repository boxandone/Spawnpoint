import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';

type Table =
  | 'tasks'
  | 'completions'
  | 'locations'
  | 'household_members'
  | 'household_settings'
  | 'households'
  | 'deed_logs'
  | 'feed_events'
  | 'member_stats'
  | 'badge_progress'
  | 'lists'
  | 'list_items'
  | 'staples'
  | 'shopping_trips'
  | 'items'
  | 'documents';

/** Subscribe to a household's changes. Realtime applies RLS, so only our rows arrive. */
export function subscribeHousehold(
  householdId: string,
  onChange: (table: Table) => void,
): () => void {
  const channel = supabase.channel(`household:${householdId}`);
  const scoped: Table[] = [
    'tasks',
    'completions',
    'locations',
    'household_members',
    'household_settings',
    'deed_logs',
    'feed_events',
    // Own rows only (RLS): someone logging for you updates your level live.
    'member_stats',
    'badge_progress',
    'lists',
    'list_items',
    'staples',
    'shopping_trips',
    'items',
    'documents',
  ];
  for (const table of scoped) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `household_id=eq.${householdId}` },
      () => onChange(table),
    );
  }
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${householdId}` },
    () => onChange('households'),
  );
  // DELETE events can't be filtered and carry only the id (docs/DECISIONS.md #15).
  for (const table of ['completions', 'list_items', 'staples', 'documents'] as const) {
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, () =>
      onChange(table),
    );
  }
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Keeps every member's screen live: a check-off on one phone shows on the other. */
export function useHouseholdRealtime(householdId: string, userId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const pending = new Set<Table>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      for (const table of pending) {
        if (table === 'tasks') void qc.invalidateQueries({ queryKey: qk.tasks(householdId) });
        if (table === 'completions') {
          void qc.invalidateQueries({ queryKey: qk.completions(householdId) });
          void qc.invalidateQueries({ queryKey: qk.history(householdId) });
        }
        if (table === 'locations')
          void qc.invalidateQueries({ queryKey: qk.locations(householdId) });
        if (['completions', 'deed_logs', 'member_stats', 'badge_progress'].includes(table)) {
          void qc.invalidateQueries({ queryKey: ['rewards'] });
          void qc.invalidateQueries({ queryKey: qk.weekXp(householdId) });
          void qc.invalidateQueries({ queryKey: qk.deedLogs(householdId) });
        }
        if (table === 'lists') void qc.invalidateQueries({ queryKey: qk.lists(householdId) });
        if (table === 'list_items')
          void qc.invalidateQueries({ queryKey: qk.listItems(householdId) });
        if (table === 'staples') void qc.invalidateQueries({ queryKey: qk.staples(householdId) });
        if (table === 'shopping_trips')
          void qc.invalidateQueries({ queryKey: qk.grocerySuggestions(householdId) });
        if (table === 'items') {
          void qc.invalidateQueries({ queryKey: qk.items(householdId) });
          void qc.invalidateQueries({ queryKey: qk.shortCodes(householdId) });
        }
        if (table === 'documents')
          void qc.invalidateQueries({ queryKey: qk.documents(householdId) });
        if (table === 'locations')
          void qc.invalidateQueries({ queryKey: qk.shortCodes(householdId) });
        if (table === 'feed_events') void qc.invalidateQueries({ queryKey: qk.feed(householdId) });
        if (
          table === 'household_members' ||
          table === 'household_settings' ||
          table === 'households'
        ) {
          void qc.invalidateQueries({ queryKey: qk.membership(userId) });
        }
      }
      pending.clear();
    };
    const unsubscribe = subscribeHousehold(householdId, (table) => {
      pending.add(table);
      clearTimeout(timer);
      timer = setTimeout(flush, 120);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [householdId, userId, qc]);
}
