import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import type { Suggestion } from './logic';

export type List = Tables<'lists'>;
export type ListItem = Tables<'list_items'>;
export type Staple = Tables<'staples'>;
export type ListKind = 'groceries' | 'to_buy' | 'todo' | 'custom';
export type NewListItem = TablesInsert<'list_items'> & { id: string };
export type ListItemPatch = TablesUpdate<'list_items'>;

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Request failed');
}

export async function listLists(householdId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('household_id', householdId)
    .is('archived_at', null)
    .order('position');
  if (error) fail(error);
  return data ?? [];
}

export async function createList(
  householdId: string,
  name: string,
  icon: string | null,
  position: number,
): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .insert({ household_id: householdId, kind: 'custom', name: name.trim(), icon, position })
    .select('*')
    .single();
  if (error) fail(error);
  return data;
}

export async function updateList(id: string, patch: TablesUpdate<'lists'>): Promise<void> {
  const { error } = await supabase.from('lists').update(patch).eq('id', id);
  if (error) fail(error);
}

/** Every item in the household. Lists are small, so one query keeps them all live. */
export async function listItems(householdId: string): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from('list_items')
    .select('*')
    .eq('household_id', householdId)
    .order('position')
    .limit(5000);
  if (error) fail(error);
  return data ?? [];
}

export async function insertItems(rows: NewListItem[]): Promise<void> {
  const { error } = await supabase.from('list_items').insert(rows);
  if (error) fail(error);
}

export async function updateItem(id: string, patch: ListItemPatch): Promise<void> {
  const { error } = await supabase.from('list_items').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function deleteItems(ids: string[]): Promise<void> {
  const { error } = await supabase.from('list_items').delete().in('id', ids);
  if (error) fail(error);
}

/** The columns a client may write, for putting a deleted item back on undo. */
export function toInsert(item: ListItem): NewListItem {
  return {
    id: item.id,
    household_id: item.household_id,
    list_id: item.list_id,
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    status: item.status,
    priority: item.priority,
    target_price: item.target_price,
    links: item.links,
    location_id: item.location_id,
    bought_on: item.bought_on,
    due_on: item.due_on,
    assignee_id: item.assignee_id,
    discuss: item.discuss,
    notes: item.notes,
    checked: item.checked,
    checked_at: item.checked_at,
    position: item.position,
  };
}

export async function listStaples(householdId: string): Promise<Staple[]> {
  const { data, error } = await supabase
    .from('staples')
    .select('*')
    .eq('household_id', householdId)
    .order('name');
  if (error) fail(error);
  return data ?? [];
}

export async function addStaple(row: TablesInsert<'staples'>): Promise<void> {
  const { error } = await supabase.from('staples').insert(row);
  if (error) fail(error);
}

export async function deleteStaple(id: string): Promise<void> {
  const { error } = await supabase.from('staples').delete().eq('id', id);
  if (error) fail(error);
}

export interface TripResult {
  trip_id: string | null;
  count: number;
  xp: boolean;
}

export async function doneShopping(listId: string): Promise<TripResult> {
  const { data, error } = await supabase.rpc('done_shopping', { p_list_id: listId });
  if (error) fail(error);
  return data as unknown as TripResult;
}

export async function undoDoneShopping(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('undo_done_shopping', { p_trip_id: tripId });
  if (error) fail(error);
}

export async function grocerySuggestions(householdId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase.rpc('grocery_suggestions', {
    p_household_id: householdId,
  });
  if (error) fail(error);
  return (data ?? []).map((r) => ({ name: r.name, quantity: r.quantity, category: r.category }));
}
