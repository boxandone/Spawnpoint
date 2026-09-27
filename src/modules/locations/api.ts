import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';
import type { LocationKind } from './logic';

export type Location = Omit<Tables<'locations'>, 'kind'> & { kind: LocationKind };

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Request failed');
}

export async function listLocations(householdId: string): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('household_id', householdId)
    .order('sort')
    .order('name');
  if (error) fail(error);
  return (data ?? []) as Location[];
}

export interface NewLocation {
  id?: string;
  household_id: string;
  parent_id?: string | null;
  kind: LocationKind;
  name: string;
  icon?: string | null;
  sort?: number;
}

export async function createLocations(rows: NewLocation[]): Promise<Location[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from('locations').insert(rows).select('*');
  if (error) fail(error);
  return (data ?? []) as Location[];
}

export async function updateLocation(
  id: string,
  patch: { name?: string; sort?: number; archived_at?: string | null },
): Promise<void> {
  const { error } = await supabase.from('locations').update(patch).eq('id', id);
  if (error) fail(error);
}
