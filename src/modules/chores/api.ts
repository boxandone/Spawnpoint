import { supabase } from '@/lib/supabase';
import type { Json, Tables } from '@/lib/database.types';
import { addDays, dayOfInstant, type IsoDate } from '@/lib/dates';
import type { Priority, IfMissed } from './logic';
import { parseSchedule } from './schedule';
import type { ChoreCompletion, ChoreTask, LogInput, TaskInput } from './types';

/** Completions older than this come only from the task_last_done view. */
export const RECENT_DAYS = 100;

const COMPLETION_COLUMNS =
  'id, task_id, done_on, kind, done_by, logged_by, quantity, note, logged_at, source';

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Request failed');
}

export function toTask(row: Tables<'tasks'>, timezone: string): ChoreTask {
  const createdOn = dayOfInstant(row.created_at, timezone);
  return {
    id: row.id,
    household_id: row.household_id,
    title: row.title,
    notes: row.notes,
    schedule: parseSchedule(row.schedule),
    if_missed: row.if_missed as IfMissed,
    priority: row.priority as Priority,
    effort: Math.min(3, Math.max(1, row.effort)) as 1 | 2 | 3,
    start_on: row.start_on ?? createdOn,
    created_on: createdOn,
    created_at: row.created_at,
    location_id: row.location_id,
    assignee_id: row.assignee_id,
    deed_key: row.deed_key,
    unit: row.unit,
    library_key: row.library_key,
    archived_at: row.archived_at,
  };
}

export async function listTasks(householdId: string, timezone: string): Promise<ChoreTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('household_id', householdId)
    .order('title');
  if (error) fail(error);
  return (data ?? []).map((r) => toTask(r, timezone));
}

/** Recent completions plus the latest one per task: all the scheduling logic needs. */
export async function listCompletions(
  householdId: string,
  today: IsoDate,
): Promise<ChoreCompletion[]> {
  const since = addDays(today, -RECENT_DAYS);
  const [recent, latest] = await Promise.all([
    supabase
      .from('completions')
      .select(COMPLETION_COLUMNS)
      .eq('household_id', householdId)
      .gte('done_on', since)
      .order('done_on', { ascending: false })
      .limit(5000),
    supabase
      .from('task_last_done')
      .select('*')
      .eq('household_id', householdId)
      .lt('done_on', since),
  ]);
  if (recent.error) fail(recent.error);
  if (latest.error) fail(latest.error);
  const rows = (recent.data ?? []) as ChoreCompletion[];
  for (const l of latest.data ?? []) {
    rows.push({
      id: l.completion_id,
      task_id: l.task_id,
      done_on: l.done_on,
      kind: l.kind as ChoreCompletion['kind'],
      done_by: null,
      logged_by: null,
      quantity: null,
      note: null,
      logged_at: null,
      source: null,
    });
  }
  return rows;
}

export async function listHistory(
  householdId: string,
  from: IsoDate,
  to: IsoDate,
): Promise<ChoreCompletion[]> {
  const { data, error } = await supabase
    .from('completions')
    .select(COMPLETION_COLUMNS)
    .eq('household_id', householdId)
    .gte('done_on', from)
    .lte('done_on', to)
    .order('done_on', { ascending: false })
    .order('logged_at', { ascending: false })
    .limit(500);
  if (error) fail(error);
  return (data ?? []) as ChoreCompletion[];
}

export function newId(): string {
  return crypto.randomUUID();
}

export function toCompletionRow(
  householdId: string,
  loggedBy: string,
  input: LogInput,
  id = newId(),
) {
  return {
    id,
    household_id: householdId,
    task_id: input.taskId,
    done_on: input.doneOn,
    done_by: input.doneBy,
    logged_by: loggedBy,
    kind: input.kind ?? 'done',
    quantity: input.quantity ?? null,
    note: input.note?.trim() ? input.note.trim() : null,
    source: input.source ?? 'tap',
    catch_up_id: input.catchUpId ?? null,
  };
}

export async function insertCompletions(rows: ReturnType<typeof toCompletionRow>[]): Promise<void> {
  const { error } = await supabase.from('completions').insert(rows);
  if (error) fail(error);
}

export async function deleteCompletions(ids: string[]): Promise<void> {
  const { error } = await supabase.from('completions').delete().in('id', ids);
  if (error) fail(error);
}

function taskRow(input: TaskInput) {
  return {
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    location_id: input.location_id,
    effort: input.effort,
    priority: input.priority,
    schedule: input.schedule as unknown as Json,
    if_missed: input.if_missed,
    assignee_id: input.assignee_id,
    deed_key: input.deed_key,
    unit: input.unit?.trim() || null,
    ...(input.start_on ? { start_on: input.start_on } : {}),
    ...(input.library_key ? { library_key: input.library_key } : {}),
  };
}

export async function createTasks(householdId: string, inputs: TaskInput[]): Promise<string[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from('tasks')
    .insert(inputs.map((i) => ({ ...taskRow(i), household_id: householdId })))
    .select('id');
  if (error) fail(error);
  return (data ?? []).map((r) => r.id);
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const { error } = await supabase.from('tasks').update(taskRow(input)).eq('id', id);
  if (error) fail(error);
}

export async function setTaskArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) fail(error);
}
