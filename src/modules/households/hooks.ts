import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/AuthProvider';
import { qk } from '@/lib/queryKeys';
import * as api from './api';
import { useHousehold } from './context';

export function useMembershipQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.membership(user?.id),
    queryFn: () => api.fetchMembership(user!.id),
    enabled: !!user,
  });
}

export function usePublicConfig() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.publicConfig,
    queryFn: api.fetchPublicConfig,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useIsOperator() {
  const { user } = useAuth();
  return useQuery({ queryKey: qk.isOperator(user?.id), queryFn: api.isOperator, enabled: !!user });
}

export function useInvalidateMembership() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => qc.invalidateQueries({ queryKey: qk.membership(user?.id) });
}

export function useUpdateProfile() {
  const { member } = useHousehold();
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateProfile>[1]) =>
      api.updateProfile(member.id, patch),
    onSettled: invalidate,
  });
}

export function useUpdateSettings() {
  const { household } = useHousehold();
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateSettings>[1]) =>
      api.updateSettings(household.id, patch),
    onSettled: invalidate,
  });
}

export function useUpdateHousehold() {
  const { household } = useHousehold();
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateHousehold>[1]) =>
      api.updateHousehold(household.id, patch),
    onSettled: invalidate,
  });
}

export function useMemberInvites(enabled: boolean) {
  return useQuery({
    queryKey: qk.invites('member'),
    queryFn: () => api.listInvites('member'),
    enabled,
  });
}
