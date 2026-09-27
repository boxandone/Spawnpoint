import type { CompletionKind, IfMissed, Priority, TaskLike } from './logic';

export interface ChoreTask extends TaskLike {
  household_id: string;
  notes: string | null;
  deed_key: string | null;
  unit: string | null;
  library_key: string | null;
  created_at: string;
}

export interface ChoreCompletion {
  id: string;
  task_id: string;
  done_on: string;
  kind: CompletionKind;
  done_by: string | null;
  logged_by: string | null;
  quantity: number | null;
  note: string | null;
  logged_at: string | null;
  source: 'tap' | 'menu' | 'catch_up' | null;
}

export interface TaskInput {
  title: string;
  notes: string | null;
  location_id: string | null;
  effort: 1 | 2 | 3;
  priority: Priority;
  schedule: TaskLike['schedule'];
  if_missed: IfMissed;
  assignee_id: string | null;
  deed_key: string | null;
  unit: string | null;
  start_on?: string | null;
  library_key?: string | null;
}

export interface LogInput {
  taskId: string;
  doneOn: string;
  doneBy: string;
  kind?: CompletionKind;
  quantity?: number | null;
  note?: string | null;
  source?: 'tap' | 'menu' | 'catch_up';
  catchUpId?: string | null;
}
