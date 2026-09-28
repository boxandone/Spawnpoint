import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useToast } from '@/components/ui';
import { qk } from '@/lib/queryKeys';
import { useHousehold } from '@/modules/households/context';
import { useCelebrate, useCopy } from '@/theme';
import * as api from './api';

export function usePlans() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.plans(household.id),
    queryFn: () => api.listPlans(household.id),
  });
}

export function useChecklist() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.checklist(household.id),
    queryFn: () => api.listChecklist(household.id),
  });
}

export function useDiscussions() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.discussions(household.id),
    queryFn: () => api.listDiscussions(household.id),
  });
}

export function useIcsToken() {
  const { member } = useHousehold();
  return useQuery({ queryKey: qk.icsToken(member.id), queryFn: api.myIcsToken });
}

function useRewardsRefresh() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['rewards'] });
    void qc.invalidateQueries({ queryKey: qk.weekXp(household.id) });
    void qc.invalidateQueries({ queryKey: qk.feed(household.id) });
  }, [qc, household.id]);
}

export function usePlanMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useCopy();
  const celebrate = useCelebrate();
  const rewards = useRewardsRefresh();
  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: qk.plans(household.id) }),
    [qc, household.id],
  );

  const create = useCallback(
    async (input: api.PlanInput) => {
      const plan = await api.createPlan(household.id, input);
      await refresh();
      rewards();
      return plan;
    },
    [household.id, refresh, rewards],
  );

  const update = useCallback(
    async (id: string, patch: api.PlanPatch, opts: { from?: HTMLElement | null } = {}) => {
      qc.setQueryData<api.Plan[]>(qk.plans(household.id), (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
      if (patch.status === 'booked' || patch.status === 'done') {
        celebrate('taskComplete', { from: opts.from });
      }
      try {
        await api.updatePlan(id, patch);
      } catch {
        toast.show({ message: t('common.error'), tone: 'danger' });
      }
      await refresh();
      if (patch.status) rewards();
    },
    [qc, household.id, refresh, rewards, toast, t, celebrate],
  );

  const archive = useCallback(
    async (plan: api.Plan) => {
      await update(plan.id, { archived_at: new Date().toISOString() });
      toast.show({
        message: t('plans.archived', { name: plan.title }),
        onUndo: () => update(plan.id, { archived_at: null }),
      });
    },
    [update, toast, t],
  );

  return { create, update, archive };
}

export function useChecklistMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useCopy();
  const key = qk.checklist(household.id);
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const setItems = (fn: (items: api.ChecklistItem[]) => api.ChecklistItem[]) =>
    qc.setQueryData<api.ChecklistItem[]>(key, (old) => fn(old ?? []));
  const failed = () => {
    toast.show({ message: t('common.error'), tone: 'danger' });
    void refresh();
  };

  return {
    add: (planId: string, text: string, position: number) => {
      const row = {
        id: crypto.randomUUID(),
        household_id: household.id,
        plan_id: planId,
        text,
        position,
      };
      const now = new Date().toISOString();
      setItems((items) => [
        ...items,
        { ...row, done: false, created_at: now, updated_at: now, created_by: null },
      ]);
      api.addChecklistItem(row).then(refresh, failed);
    },
    toggle: (item: api.ChecklistItem) => {
      setItems((items) => items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
      api.updateChecklistItem(item.id, { done: !item.done }).then(refresh, failed);
    },
    remove: (item: api.ChecklistItem) => {
      setItems((items) => items.filter((i) => i.id !== item.id));
      const done = api.deleteChecklistItem(item.id).then(refresh, failed);
      toast.show({
        message: t('lists.itemDeleted', { name: item.text }),
        onUndo: async () => {
          await done;
          await api.addChecklistItem({
            id: item.id,
            household_id: item.household_id,
            plan_id: item.plan_id,
            text: item.text,
            done: item.done,
            position: item.position,
          });
          await refresh();
        },
      });
    },
  };
}

/** Mark something discussed, with undo. The database records the decision and XP. */
export function useResolveDiscussion() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useCopy();
  const rewards = useRewardsRefresh();
  return useCallback(
    async (input: { planId?: string; listItemId?: string; note: string }) => {
      const refresh = () => {
        void qc.invalidateQueries({ queryKey: qk.plans(household.id) });
        void qc.invalidateQueries({ queryKey: qk.listItems(household.id) });
        void qc.invalidateQueries({ queryKey: qk.discussions(household.id) });
        rewards();
      };
      try {
        const id = await api.resolveDiscussion(input);
        refresh();
        toast.show({
          message: t('talk.resolved'),
          onUndo: async () => {
            await api.undoDiscussion(id);
            refresh();
          },
        });
      } catch {
        toast.show({ message: t('common.error'), tone: 'danger' });
        refresh();
      }
    },
    [qc, household.id, toast, t, rewards],
  );
}
