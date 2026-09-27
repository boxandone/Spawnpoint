import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui';
import { qk } from '@/lib/queryKeys';
import { useHousehold } from '@/modules/households/context';
import { useLocations } from '@/modules/locations/hooks';
import { useCelebrate, useCopy } from '@/theme';
import * as api from './api';
import { weeklyPoints, type ScheduleContext } from './logic';
import type { ChoreCompletion, LogInput, TaskInput } from './types';

export function useTasks() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: qk.tasks(household.id),
    queryFn: () => api.listTasks(household.id, household.timezone),
  });
}

export function useCompletions() {
  const { household, today } = useHousehold();
  return useQuery({
    queryKey: [...qk.completions(household.id), today],
    queryFn: () => api.listCompletions(household.id, today),
  });
}

/** Everything the chores screens need, with the zone-rotation context ready. */
export function useChores() {
  const { settings, today } = useHousehold();
  const tasksQ = useTasks();
  const completionsQ = useCompletions();
  const { locations, ancestry, isLoading: locLoading } = useLocations();
  const tasks = useMemo(() => tasksQ.data ?? [], [tasksQ.data]);
  const completions = useMemo(() => completionsQ.data ?? [], [completionsQ.data]);
  const ctx = useMemo<ScheduleContext>(
    () => ({ rotation: settings.zone_rotation, ancestry }),
    [settings.zone_rotation, ancestry],
  );
  return {
    tasks,
    completions,
    locations,
    ancestry,
    ctx,
    today,
    isLoading: tasksQ.isLoading || completionsQ.isLoading || locLoading,
    error: tasksQ.error ?? completionsQ.error ?? null,
  };
}

function toClient(row: ReturnType<typeof api.toCompletionRow>): ChoreCompletion {
  return {
    id: row.id,
    task_id: row.task_id,
    done_on: row.done_on,
    kind: row.kind,
    done_by: row.done_by,
    logged_by: row.logged_by,
    quantity: row.quantity,
    note: row.note,
    logged_at: new Date().toISOString(),
    source: row.source,
  };
}

interface LogOptions {
  /** Element the celebration starts from. */
  from?: HTMLElement | null;
  /** Toast text; defaults to the theme's completion message. */
  message?: string;
  celebrate?: boolean;
}

/**
 * Log one or more completions with an optimistic update, a celebration, and a
 * 6-second undo toast. Undo waits for the insert, then deletes the rows.
 */
export function useLogCompletions() {
  const { household, member, today, settings } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const celebrate = useCelebrate();
  const t = useCopy();
  const key = useMemo(() => [...qk.completions(household.id), today], [household.id, today]);

  return useCallback(
    (inputs: LogInput[], opts: LogOptions = {}) => {
      if (inputs.length === 0) return;
      const rows = inputs.map((i) => api.toCompletionRow(household.id, member.id, i));
      const ids = rows.map((r) => r.id);
      const tasks =
        qc.getQueryData<Awaited<ReturnType<typeof api.listTasks>>>(qk.tasks(household.id)) ?? [];
      const effortOf = (id: string) => tasks.find((x) => x.id === id)?.effort;
      const before = qc.getQueryData<ChoreCompletion[]>(key) ?? [];
      const pointsBefore = weeklyPoints(before, effortOf, today);

      qc.setQueryData<ChoreCompletion[]>(key, (old) => [...rows.map(toClient), ...(old ?? [])]);
      const removeFromCache = () =>
        qc.setQueryData<ChoreCompletion[]>(key, (old) =>
          (old ?? []).filter((c) => !ids.includes(c.id)),
        );

      const allSkipped = inputs.every((i) => i.kind === 'skipped');
      if (opts.celebrate !== false && !allSkipped) celebrate('taskComplete', { from: opts.from });

      const pointsAfter = weeklyPoints([...rows.map(toClient), ...before], effortOf, today);
      if (pointsBefore < settings.weekly_target && pointsAfter >= settings.weekly_target) {
        setTimeout(
          () =>
            celebrate('meterFull', {
              from: document.getElementById('weekly-meter'),
              text: t('meter.full'),
            }),
          450,
        );
      }

      const insert = api.insertCompletions(rows).then(
        () => qc.invalidateQueries({ queryKey: qk.completions(household.id) }),
        (err: unknown) => {
          removeFromCache();
          toast.show({ message: t('common.error'), tone: 'danger' });
          throw err;
        },
      );
      void insert.catch(() => undefined);

      toast.show({
        message: opts.message ?? (allSkipped ? t('task.skippedToast') : t('task.completeToast')),
        onUndo: async () => {
          removeFromCache();
          try {
            await insert;
          } catch {
            return; // never landed; nothing to undo
          }
          try {
            await api.deleteCompletions(ids);
          } finally {
            void qc.invalidateQueries({ queryKey: qk.completions(household.id) });
            void qc.invalidateQueries({ queryKey: qk.history(household.id) });
          }
        },
      });
    },
    [household.id, member.id, today, settings.weekly_target, qc, key, toast, celebrate, t],
  );
}

export function useTaskMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useCopy();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.tasks(household.id) });

  const create = useMutation({
    mutationFn: (inputs: TaskInput[]) => api.createTasks(household.id, inputs),
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskInput }) => api.updateTask(id, input),
    onSettled: invalidate,
  });
  const archive = useCallback(
    async (id: string) => {
      await api.setTaskArchived(id, true);
      await invalidate();
      toast.show({
        message: t('task.archived'),
        onUndo: async () => {
          await api.setTaskArchived(id, false);
          await invalidate();
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [household.id, toast, t],
  );
  return { create, update, archive };
}

export function useHistory(from: string, to: string) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: [...qk.history(household.id), from, to],
    queryFn: () => api.listHistory(household.id, from, to),
  });
}
