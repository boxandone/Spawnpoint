import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';

type Table =
  'tasks' | 'completions' | 'locations' | 'household_members' | 'household_settings' | 'households';

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
  channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'completions' }, () =>
    onChange('completions'),
  );
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
