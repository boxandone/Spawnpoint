import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qk } from '@/lib/queryKeys';
import { useHousehold } from '@/modules/households/context';
import * as api from './api';
import { makeAncestry } from './logic';

export function useLocations() {
  const { household } = useHousehold();
  const query = useQuery({
    queryKey: qk.locations(household.id),
    queryFn: () => api.listLocations(household.id),
  });
  const locations = useMemo(() => query.data ?? [], [query.data]);
  const ancestry = useMemo(() => makeAncestry(locations), [locations]);
  return { ...query, locations, ancestry };
}

export function useLocationMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.locations(household.id) });
  const create = useMutation({
    mutationFn: (rows: Omit<api.NewLocation, 'household_id'>[]) =>
      api.createLocations(rows.map((r) => ({ ...r, household_id: household.id }))),
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateLocation>[1] }) =>
      api.updateLocation(id, patch),
    onSettled: invalidate,
  });
  return { create, update };
}
