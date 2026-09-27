import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui';
import { qk } from '@/lib/queryKeys';
import { useHousehold } from '@/modules/households/context';
import { useCopy } from '@/theme';
import * as api from './api';

export function useItems() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.items(household.id),
    queryFn: () => api.listItems(household.id),
  });
}

export function useDocuments() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.documents(household.id),
    queryFn: () => api.listDocuments(household.id),
  });
}

/** Short codes by item id and by location id. */
export function useShortCodes() {
  const { household } = useHousehold();
  const q = useQuery({
    queryKey: qk.shortCodes(household.id),
    queryFn: () => api.listShortCodes(household.id),
  });
  return useMemo(() => {
    const byItem = new Map<string, string>();
    const byLocation = new Map<string, string>();
    for (const c of q.data ?? []) {
      if (c.item_id) byItem.set(c.item_id, c.code);
      if (c.location_id) byLocation.set(c.location_id, c.code);
    }
    return { byItem, byLocation, isLoading: q.isLoading };
  }, [q.data, q.isLoading]);
}

/** Signed links for private files, refreshed well before they expire. */
export function useSignedUrls(paths: readonly (string | null | undefined)[]) {
  const list = useMemo(() => [...new Set(paths.filter((p): p is string => !!p))].sort(), [paths]);
  return useQuery({
    queryKey: qk.signedUrls(list),
    queryFn: () => api.signedUrls(list),
    enabled: list.length > 0,
    staleTime: 45 * 60_000,
    gcTime: 50 * 60_000,
  });
}

export function useStuffMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useCopy();

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: qk.items(household.id) });
    void qc.invalidateQueries({ queryKey: qk.shortCodes(household.id) });
    void qc.invalidateQueries({ queryKey: ['rewards'] });
    void qc.invalidateQueries({ queryKey: qk.weekXp(household.id) });
  }, [qc, household.id]);

  const create = useCallback(
    async (input: api.ItemInput) => {
      const item = await api.createItem(household.id, input);
      refresh();
      return item;
    },
    [household.id, refresh],
  );

  const update = useCallback(
    async (id: string, patch: api.ItemPatch) => {
      qc.setQueryData<api.Item[]>(qk.items(household.id), (old) =>
        (old ?? []).map((i) => (i.id === id ? { ...i, ...patch } : i)),
      );
      try {
        await api.updateItem(id, patch);
      } catch {
        toast.show({ message: t('common.error'), tone: 'danger' });
      }
      refresh();
    },
    [qc, household.id, refresh, toast, t],
  );

  const archive = useCallback(
    async (item: api.Item) => {
      await update(item.id, { archived_at: new Date().toISOString() });
      toast.show({
        message: t('stuff.archived', { name: item.name }),
        onUndo: () => update(item.id, { archived_at: null }),
      });
    },
    [update, toast, t],
  );

  return { create, update, archive, refresh };
}

export function useDocumentMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: qk.documents(household.id) });
    void qc.invalidateQueries({ queryKey: ['rewards'] });
    void qc.invalidateQueries({ queryKey: qk.weekXp(household.id) });
  }, [qc, household.id]);

  const upload = useCallback(
    async (input: Omit<Parameters<typeof api.uploadDocument>[0], 'householdId'>) => {
      try {
        return await api.uploadDocument({ ...input, householdId: household.id });
      } finally {
        refresh();
      }
    },
    [household.id, refresh],
  );
  const remove = useCallback(
    async (doc: api.Doc) => {
      qc.setQueryData<api.Doc[]>(qk.documents(household.id), (old) =>
        (old ?? []).filter((d) => d.id !== doc.id),
      );
      try {
        await api.deleteDocument(doc);
      } finally {
        refresh();
      }
    },
    [qc, household.id, refresh],
  );
  const rename = useCallback(
    async (doc: api.Doc, patch: { title?: string | null; kind?: string }) => {
      await api.updateDocument(doc.id, patch);
      refresh();
    },
    [refresh],
  );
  return { upload, remove, rename };
}
