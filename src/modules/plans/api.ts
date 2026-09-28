import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';

export type Plan = Tables<'plans'>;
export type PlanInput = Omit<TablesInsert<'plans'>, 'household_id'>;
export type PlanPatch = TablesUpdate<'plans'>;
export type ChecklistItem = Tables<'plan_checklist_items'>;
export type Discussion = Tables<'discussions'>;
export type IcsToken = Tables<'ics_tokens'>;

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Request failed');
}

export async function listPlans(householdId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('household_id', householdId)
    .order('starts_on', { ascending: true, nullsFirst: false })
    .limit(2000);
  if (error) fail(error);
  return data ?? [];
}

export async function createPlan(householdId: string, input: PlanInput): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .insert({ ...input, household_id: householdId })
    .select('*')
    .single();
  if (error) fail(error);
  return data;
}

export async function updatePlan(id: string, patch: PlanPatch): Promise<void> {
  const { error } = await supabase.from('plans').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function listChecklist(householdId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('plan_checklist_items')
    .select('*')
    .eq('household_id', householdId)
    .order('position')
    .limit(5000);
  if (error) fail(error);
  return data ?? [];
}

export async function addChecklistItem(row: TablesInsert<'plan_checklist_items'>): Promise<void> {
  const { error } = await supabase.from('plan_checklist_items').insert(row);
  if (error) fail(error);
}

export async function updateChecklistItem(
  id: string,
  patch: TablesUpdate<'plan_checklist_items'>,
): Promise<void> {
  const { error } = await supabase.from('plan_checklist_items').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase.from('plan_checklist_items').delete().eq('id', id);
  if (error) fail(error);
}

export async function listDiscussions(householdId: string): Promise<Discussion[]> {
  const { data, error } = await supabase
    .from('discussions')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) fail(error);
  return data ?? [];
}

export async function resolveDiscussion(input: {
  planId?: string;
  listItemId?: string;
  note: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('resolve_discussion', {
    p_plan_id: input.planId ?? null,
    p_list_item_id: input.listItemId ?? null,
    p_note: input.note,
  });
  if (error) fail(error);
  return data;
}

export async function undoDiscussion(id: string): Promise<void> {
  const { error } = await supabase.rpc('undo_discussion', { p_id: id });
  if (error) fail(error);
}

export async function myIcsToken(): Promise<IcsToken | null> {
  const { data, error } = await supabase
    .from('ics_tokens')
    .select('id, member_id, chores, last_used_at, created_at')
    .maybeSingle();
  if (error) fail(error);
  return data;
}

export async function createIcsToken(): Promise<string> {
  const { data, error } = await supabase.rpc('create_ics_token');
  if (error) fail(error);
  return data;
}

export async function revokeIcsToken(): Promise<void> {
  const { error } = await supabase.rpc('revoke_ics_token');
  if (error) fail(error);
}

export async function setIcsChores(mode: 'none' | 'high' | 'fixed'): Promise<void> {
  const { error } = await supabase.rpc('set_ics_chores', { p_mode: mode });
  if (error) fail(error);
}

export function feedUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/.netlify/functions/ics?token=${token}`;
}
