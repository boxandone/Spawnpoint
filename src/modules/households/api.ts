import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import {
  DEFAULT_MODULES,
  type Household,
  type InviteResult,
  type JoinResult,
  type Member,
  type MemberInvite,
  type Membership,
  type Modules,
  type OperatorStats,
  type PeekResult,
  type PublicConfig,
  type Settings,
} from './types';

const INVITE_COLUMNS =
  'id, kind, household_id, label, expires_at, max_uses, use_count, revoked_at, last_used_at, created_at, created_household_id';

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Request failed');
}

function toSettings(row: Record<string, unknown>): Settings {
  return {
    ...(row as unknown as Settings),
    modules: { ...DEFAULT_MODULES, ...((row.modules as Partial<Modules>) ?? {}) },
    zone_rotation: (row.zone_rotation as Record<string, string[]>) ?? {},
  };
}

/** The signed-in user's active membership, or null if they have no household. */
export async function fetchMembership(userId: string): Promise<Membership | null> {
  const { data: me, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) fail(error);
  if (!me) return null;

  const hid = me.household_id;
  const [household, settings, members] = await Promise.all([
    supabase.from('households').select('*').eq('id', hid).single(),
    supabase.from('household_settings').select('*').eq('household_id', hid).single(),
    supabase.from('household_members').select('*').eq('household_id', hid).order('joined_at'),
  ]);
  if (household.error) fail(household.error);
  if (settings.error) fail(settings.error);
  if (members.error) fail(members.error);

  return {
    member: me as Member,
    household: household.data as Household,
    settings: toSettings(settings.data as unknown as Record<string, unknown>),
    members: members.data as Member[],
  };
}

export async function fetchPublicConfig(): Promise<PublicConfig> {
  const { data, error } = await supabase.rpc('public_config');
  if (error) fail(error);
  return data as unknown as PublicConfig;
}

export async function isOperator(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_operator');
  if (error) fail(error);
  return Boolean(data);
}

/** Asks the server to copy OPERATOR_EMAILS and settings into the database. */
export async function syncConfig(): Promise<void> {
  try {
    await fetch('/.netlify/functions/sync-config', { method: 'POST' });
  } catch {
    /* offline or running without Netlify: nothing to sync */
  }
}

export async function peekInvite(code: string): Promise<PeekResult> {
  const { data, error } = await supabase.rpc('peek_invite', { p_code: code });
  if (error) fail(error);
  return data as unknown as PeekResult;
}

export interface ProfileInput {
  displayName: string;
  avatar: string | null;
  color: string;
  theme?: string | null;
}

export async function createHousehold(input: {
  name: string;
  timezone: string;
  code: string | null;
  profile: ProfileInput;
  theme: string;
}): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('create_household', {
    p_name: input.name,
    p_timezone: input.timezone,
    p_display_name: input.profile.displayName,
    p_code: input.code ?? undefined,
    p_avatar: input.profile.avatar ?? undefined,
    p_color: input.profile.color,
    p_theme: input.theme,
  });
  if (error) fail(error);
  return data as unknown as JoinResult;
}

export async function acceptMemberInvite(code: string, profile: ProfileInput): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('accept_member_invite', {
    p_code: code,
    p_display_name: profile.displayName,
    p_avatar: profile.avatar ?? undefined,
    p_color: profile.color,
    p_theme: profile.theme ?? undefined,
  });
  if (error) fail(error);
  return data as unknown as JoinResult;
}

export async function createMemberInvite(householdId: string): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('create_member_invite', {
    p_household_id: householdId,
  });
  if (error) fail(error);
  return data as unknown as InviteResult;
}

export async function createHouseholdInvite(label: string | null): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('create_household_invite', {
    p_label: label ?? undefined,
  });
  if (error) fail(error);
  return data as unknown as InviteResult;
}

export async function listInvites(kind: 'member' | 'household'): Promise<MemberInvite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select(INVITE_COLUMNS)
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) fail(error);
  return (data ?? []) as MemberInvite[];
}

export async function revokeInvite(id: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_invite', { p_invite_id: id });
  if (error) fail(error);
}

export async function renameInvite(id: string, label: string): Promise<void> {
  const { error } = await supabase.rpc('rename_invite', { p_invite_id: id, p_label: label });
  if (error) fail(error);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member', { p_member_id: memberId });
  if (error) fail(error);
}

export async function setMemberRole(memberId: string, role: 'owner' | 'member'): Promise<void> {
  const { error } = await supabase.rpc('set_member_role', { p_member_id: memberId, p_role: role });
  if (error) fail(error);
}

export async function leaveHousehold(): Promise<void> {
  const { error } = await supabase.rpc('leave_household');
  if (error) fail(error);
}

export async function updateProfile(
  memberId: string,
  patch: Partial<Pick<Member, 'display_name' | 'avatar' | 'color' | 'theme' | 'mode'>>,
): Promise<void> {
  const { error } = await supabase.from('household_members').update(patch).eq('id', memberId);
  if (error) fail(error);
}

export async function updateHousehold(
  id: string,
  patch: { name?: string; timezone?: string },
): Promise<void> {
  const { error } = await supabase.from('households').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function updateSettings(
  householdId: string,
  patch: Partial<{
    modules: Modules;
    default_theme: string;
    weekly_target: number;
    zone_rotation: Record<string, string[]>;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from('household_settings')
    .update(
      patch as {
        modules?: Json;
        zone_rotation?: Json;
        default_theme?: string;
        weekly_target?: number;
      },
    )
    .eq('household_id', householdId);
  if (error) fail(error);
}

export async function fetchOperatorStats(): Promise<OperatorStats> {
  const { data, error } = await supabase.rpc('operator_stats');
  if (error) fail(error);
  return data as unknown as OperatorStats;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
