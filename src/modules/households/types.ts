import type { Tables } from '@/lib/database.types';
import type { ModePreference } from '@/theme';

export type Household = Tables<'households'>;
export type Member = Omit<Tables<'household_members'>, 'role' | 'status' | 'mode'> & {
  role: 'owner' | 'member';
  status: 'active' | 'left' | 'removed';
  mode: ModePreference;
};

export interface Modules {
  chores: boolean;
  lists: boolean;
  stuff: boolean;
  plans: boolean;
  pantry: boolean;
  rewards: boolean;
  calendar: boolean;
}

export const DEFAULT_MODULES: Modules = {
  chores: true,
  lists: true,
  stuff: true,
  plans: true,
  pantry: false,
  rewards: true,
  calendar: true,
};

export type Settings = Omit<Tables<'household_settings'>, 'modules' | 'zone_rotation'> & {
  modules: Modules;
  zone_rotation: Record<string, string[]>;
};

export interface MemberInvite {
  id: string;
  kind: 'household' | 'member';
  household_id: string | null;
  label: string | null;
  expires_at: string;
  max_uses: number;
  use_count: number;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
  /** Household invites only: the household it created. */
  created_household_id: string | null;
}

export type InviteResult =
  { ok: true; id: string; code: string; expires_at: string } | { ok: false; error: string };

export type PeekResult =
  | {
      ok: true;
      kind: 'household' | 'member';
      household_name: string | null;
      expires_at: string;
      already_member: boolean;
    }
  | { ok: false; error: 'invalid' | 'rate_limited' | 'not_signed_in' };

export type JoinResult =
  | { ok: true; household_id: string; member_id: string }
  | {
      ok: false;
      error: 'invalid' | 'rate_limited' | 'not_signed_in' | 'already_member' | 'invite_required';
    };

export interface PublicConfig {
  household_creation: 'invite_only' | 'open';
  household_storage_mb: number;
  operator_name: string;
}

export interface OperatorStats {
  households: number;
  members: number;
  open_household_invites: number;
  storage: Array<{ household_ref: string; bytes: number }>;
  storage_quota_mb: number;
}

export interface Membership {
  member: Member;
  household: Household;
  settings: Settings;
  members: Member[];
}
