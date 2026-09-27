import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useToast } from '@/components/ui';
import { weekBounds, type IsoDate } from '@/lib/dates';
import { qk } from '@/lib/queryKeys';
import { useHousehold } from '@/modules/households/context';
import { useCelebrate, useCopy } from '@/theme';
import * as api from './api';

export function useMyRewards() {
  const { member } = useHousehold();
  return useQuery({ queryKey: qk.myRewards(member.id), queryFn: api.fetchMyRewards });
}

export function useMyBadges() {
  const { member } = useHousehold();
  return useQuery({ queryKey: qk.myBadges(member.id), queryFn: api.fetchMyBadges });
}

export function useShop() {
  const { member } = useHousehold();
  return useQuery({ queryKey: qk.shop(member.id), queryFn: api.listRewards });
}

export function useFeed() {
  const { household } = useHousehold();
  return useQuery({ queryKey: qk.feed(household.id), queryFn: () => api.listFeed(household.id) });
}

export function useWeekXp() {
  const { household, today } = useHousehold();
  const { start } = weekBounds(today);
  return useQuery({
    queryKey: [...qk.weekXp(household.id), start],
    queryFn: () => api.householdWeekXp(household.id, start),
  });
}

/** Refresh everything a reward-earning action can change. */
export function useInvalidateRewards() {
  const qc = useQueryClient();
  const { household, member } = useHousehold();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['rewards'] });
    void qc.invalidateQueries({ queryKey: qk.feed(household.id) });
    void qc.invalidateQueries({ queryKey: qk.weekXp(household.id) });
    void qc.invalidateQueries({ queryKey: qk.deedLogs(household.id) });
    void member; // keys are per member; the prefix covers them
  }, [qc, household.id, member]);
}

/** "Log a fix", with a celebration and a 6-second undo. */
export function useLogDeed() {
  const toast = useToast();
  const t = useCopy();
  const celebrate = useCelebrate();
  const invalidate = useInvalidateRewards();
  return useCallback(
    async (
      input: { deedKey: string; day: IsoDate; quantity: number; doneBy: string },
      from?: HTMLElement | null,
    ) => {
      celebrate('taskComplete', { from });
      let id: string;
      try {
        id = await api.logDeed(input);
      } catch {
        toast.show({ message: t('common.error'), tone: 'danger' });
        return;
      }
      invalidate();
      toast.show({
        message: t('fix.logged'),
        onUndo: async () => {
          await api.undoDeedLog(id);
          invalidate();
        },
      });
    },
    [celebrate, invalidate, toast, t],
  );
}
