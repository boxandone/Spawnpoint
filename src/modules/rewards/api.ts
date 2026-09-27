import { supabase } from '@/lib/supabase';
import type { IsoDate } from '@/lib/dates';

function fail(error: { message: string; hint?: string } | null): never {
  const err = new Error(error?.message ?? 'Request failed') as Error & { hint?: string };
  err.hint = error?.hint;
  throw err;
}

export interface SeasonGoal {
  key: string;
  progress: number;
  target: number;
}

export interface MyRewards {
  xp_total: number;
  level: number;
  level_start: number;
  level_next: number;
  coins: number;
  active_weeks: number;
  current_run: number;
  season: { key: string; start: IsoDate; end: IsoDate; goals: SeasonGoal[]; done: number };
}

export async function fetchMyRewards(): Promise<MyRewards | null> {
  const { data, error } = await supabase.rpc('my_rewards');
  if (error) fail(error);
  return data as unknown as MyRewards | null;
}

export interface BadgeRow {
  badge_key: string;
  count: number;
  tier: number;
  tier_earned_at: string | null;
}

export async function fetchMyBadges(): Promise<BadgeRow[]> {
  // RLS returns only the caller's own rows.
  const { data, error } = await supabase
    .from('badge_progress')
    .select('badge_key, count, tier, tier_earned_at');
  if (error) fail(error);
  return (data ?? []).map((r) => ({ ...r, count: Number(r.count) }));
}

export interface Reward {
  id: string;
  name: string;
  icon: string;
  cost: number;
  archived_at: string | null;
}

export async function listRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('id, name, icon, cost, archived_at')
    .is('archived_at', null)
    .order('cost');
  if (error) fail(error);
  return data ?? [];
}

export async function createReward(input: {
  name: string;
  icon: string;
  cost: number;
}): Promise<void> {
  const { error } = await supabase.from('rewards').insert(input);
  if (error) fail(error);
}

export async function updateReward(
  id: string,
  patch: Partial<Pick<Reward, 'name' | 'icon' | 'cost' | 'archived_at'>>,
) {
  const { error } = await supabase.from('rewards').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function redeemReward(
  id: string,
  post: boolean,
): Promise<{ id: string; balance: number }> {
  const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: id, p_post: post });
  if (error) fail(error);
  return data as unknown as { id: string; balance: number };
}

export async function undoRedemption(id: string): Promise<void> {
  const { error } = await supabase.rpc('undo_redemption', { p_id: id });
  if (error) fail(error);
}

export async function logDeed(input: {
  deedKey: string;
  day: IsoDate;
  quantity: number;
  doneBy: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('log_deed', {
    p_deed_key: input.deedKey,
    p_day: input.day,
    p_quantity: input.quantity,
    p_done_by: input.doneBy,
  });
  if (error) fail(error);
  return data as string;
}

export async function undoDeedLog(id: string): Promise<void> {
  const { error } = await supabase.rpc('undo_deed_log', { p_id: id });
  if (error) fail(error);
}

export interface FeedEvent {
  id: string;
  member_id: string;
  kind: 'badge' | 'redeem';
  payload: {
    badge_key?: string;
    tier?: number;
    tiers?: number;
    area?: string;
    name?: string;
    icon?: string;
  };
  created_at: string;
}

export async function listFeed(householdId: string): Promise<FeedEvent[]> {
  const { data, error } = await supabase
    .from('feed_events')
    .select('id, member_id, kind, payload, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) fail(error);
  return (data ?? []) as unknown as FeedEvent[];
}

export async function householdWeekXp(householdId: string, weekStart: IsoDate): Promise<number> {
  const { data, error } = await supabase.rpc('household_week_xp', {
    p_household_id: householdId,
    p_week_start: weekStart,
  });
  if (error) fail(error);
  return Number(data ?? 0);
}

export interface DeedLogEntry {
  id: string;
  member_id: string;
  logged_by: string;
  deed_key: string;
  day: IsoDate;
  quantity: number;
  completion_id: string | null;
}

/** "Log a fix" entries for History (task-linked deeds already show as completions). */
export async function listFixLogs(
  householdId: string,
  from: IsoDate,
  to: IsoDate,
): Promise<DeedLogEntry[]> {
  const { data, error } = await supabase
    .from('deed_logs')
    .select('id, member_id, logged_by, deed_key, day, quantity, completion_id')
    .eq('household_id', householdId)
    .is('completion_id', null)
    .gte('day', from)
    .lte('day', to)
    .order('day', { ascending: false });
  if (error) fail(error);
  return (data ?? []).map((d) => ({ ...d, quantity: Number(d.quantity) }));
}
