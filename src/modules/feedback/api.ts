import { supabase } from '@/lib/supabase';

export type FeedbackKind = 'bug' | 'question' | 'idea';

export interface Feedback {
  id: string;
  kind: FeedbackKind;
  message: string;
  page: string | null;
  app_version: string | null;
  status: 'open' | 'done';
  operator_note: string | null;
  household_id: string | null;
  created_at: string;
}

const COLUMNS =
  'id, kind, message, page, app_version, status, operator_note, household_id, created_at';

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Request failed');
}

export async function sendFeedback(input: {
  kind: FeedbackKind;
  message: string;
  page: string;
  appVersion: string;
}) {
  const { error } = await supabase.from('feedback').insert({
    kind: input.kind,
    message: input.message.trim(),
    page: input.page.slice(0, 200),
    app_version: input.appVersion.slice(0, 20),
    user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error) fail(error);
}

/** RLS returns the sender's own messages, or everything for an operator. */
export async function listFeedback(status?: 'open' | 'done'): Promise<Feedback[]> {
  let q = supabase
    .from('feedback')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) fail(error);
  return (data ?? []) as Feedback[];
}

export async function setFeedbackStatus(id: string, status: 'open' | 'done', note?: string) {
  const { error } = await supabase.rpc('set_feedback_status', {
    p_id: id,
    p_status: status,
    p_note: note ?? undefined,
  });
  if (error) fail(error);
}
