import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui';
import { qk } from '@/lib/queryKeys';
import { useHousehold } from '@/modules/households/context';
import { useCelebrate, useCopy } from '@/theme';
import * as api from './api';
import type { ListItem, ListItemPatch, NewListItem } from './api';

export function useLists() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.lists(household.id),
    queryFn: () => api.listLists(household.id),
  });
}

export function useListItems() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.listItems(household.id),
    queryFn: () => api.listItems(household.id),
  });
}

export function useStaples() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.staples(household.id),
    queryFn: () => api.listStaples(household.id),
  });
}

export function useGrocerySuggestions(enabled: boolean) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.grocerySuggestions(household.id),
    queryFn: () => api.grocerySuggestions(household.id),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Optimistic add, edit, delete (with undo), and reorder for list items. */
export function useItemMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useCopy();
  const key = useMemo(() => qk.listItems(household.id), [household.id]);

  const setItems = useCallback(
    (fn: (items: ListItem[]) => ListItem[]) =>
      qc.setQueryData<ListItem[]>(key, (old) => fn(old ?? [])),
    [qc, key],
  );
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: key }), [qc, key]);
  const failed = useCallback(() => {
    toast.show({ message: t('common.error'), tone: 'danger' });
    void refresh();
  }, [toast, t, refresh]);

  const add = useCallback(
    (rows: Array<Omit<NewListItem, 'id' | 'household_id'>>) => {
      const full = rows.map((r) => ({
        ...r,
        id: crypto.randomUUID(),
        household_id: household.id,
      }));
      const now = new Date().toISOString();
      setItems((items) => [
        ...full.map((r): ListItem => ({
          quantity: null,
          category: null,
          status: null,
          priority: 'normal',
          target_price: null,
          links: [],
          location_id: null,
          bought_on: null,
          due_on: null,
          assignee_id: null,
          discuss: false,
          notes: null,
          checked: false,
          checked_at: null,
          checked_by: null,
          position: 0,
          created_at: now,
          updated_at: now,
          created_by: null,
          ...r,
        })),
        ...items,
      ]);
      api.insertItems(full).then(refresh, failed);
      return full.map((r) => r.id);
    },
    [household.id, setItems, refresh, failed],
  );

  const update = useCallback(
    (id: string, patch: ListItemPatch) => {
      setItems((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      api.updateItem(id, patch).then(refresh, failed);
    },
    [setItems, refresh, failed],
  );

  const remove = useCallback(
    (targets: ListItem[], message?: string) => {
      if (targets.length === 0) return;
      const ids = targets.map((i) => i.id);
      setItems((items) => items.filter((i) => !ids.includes(i.id)));
      const done = api.deleteItems(ids).then(refresh, (err: unknown) => {
        failed();
        throw err;
      });
      void done.catch(() => undefined);
      toast.show({
        message:
          message ??
          (targets.length === 1
            ? t('lists.itemDeleted', { name: targets[0]?.name ?? '' })
            : t('lists.cleared', { count: targets.length })),
        onUndo: async () => {
          setItems((items) => [...targets, ...items]);
          try {
            await done;
          } catch {
            return;
          }
          try {
            await api.insertItems(targets.map(api.toInsert));
          } finally {
            void refresh();
          }
        },
      });
    },
    [setItems, refresh, failed, toast, t],
  );

  return { add, update, remove };
}

/** "Done shopping": clears the cart into a trip, with undo. XP comes from the database. */
export function useDoneShopping() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useCopy();
  const celebrate = useCelebrate();

  return useCallback(
    async (listId: string, cart: ListItem[], from?: HTMLElement | null) => {
      const key = qk.listItems(household.id);
      const ids = new Set(cart.map((i) => i.id));
      qc.setQueryData<ListItem[]>(key, (old) => (old ?? []).filter((i) => !ids.has(i.id)));
      const refreshAll = () => {
        void qc.invalidateQueries({ queryKey: key });
        void qc.invalidateQueries({ queryKey: qk.grocerySuggestions(household.id) });
        void qc.invalidateQueries({ queryKey: ['rewards'] });
        void qc.invalidateQueries({ queryKey: qk.weekXp(household.id) });
      };
      try {
        const result = await api.doneShopping(listId);
        celebrate('taskComplete', { from });
        refreshAll();
        toast.show({
          message: t('grocery.doneToast', { count: result.count }),
          onUndo: result.trip_id
            ? async () => {
                await api.undoDoneShopping(result.trip_id as string);
                refreshAll();
              }
            : undefined,
        });
      } catch {
        toast.show({ message: t('common.error'), tone: 'danger' });
        refreshAll();
      }
    },
    [household.id, qc, toast, t, celebrate],
  );
}

/** Add and remove staples; removing shows an undo. */
export function useStapleMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useCopy();
  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: qk.staples(household.id) }),
    [qc, household.id],
  );

  const add = useCallback(
    async (input: { name: string; quantity?: string | null; category?: string | null }) => {
      try {
        await api.addStaple({ household_id: household.id, ...input });
      } catch {
        toast.show({ message: t('common.error'), tone: 'danger' });
      }
      await refresh();
    },
    [household.id, refresh, toast, t],
  );

  const remove = useCallback(
    async (staple: api.Staple) => {
      qc.setQueryData<api.Staple[]>(qk.staples(household.id), (old) =>
        (old ?? []).filter((s) => s.id !== staple.id),
      );
      await api.deleteStaple(staple.id).catch(() => undefined);
      await refresh();
      toast.show({
        message: t('lists.itemDeleted', { name: staple.name }),
        onUndo: async () => {
          await api
            .addStaple({
              household_id: household.id,
              name: staple.name,
              quantity: staple.quantity,
              category: staple.category,
            })
            .catch(() => undefined);
          await refresh();
        },
      });
    },
    [qc, household.id, refresh, toast, t],
  );

  return { add, remove };
}

/** A list's display name: built-ins come from the theme's words. */
export function useListTitle() {
  const t = useCopy();
  return useCallback(
    (list: Pick<api.List, 'kind' | 'name'>) =>
      list.kind === 'groceries'
        ? t('lists.groceries')
        : list.kind === 'to_buy'
          ? t('lists.toBuy')
          : list.kind === 'todo'
            ? t('lists.todo')
            : (list.name ?? ''),
    [t],
  );
}
