/**
 * Copies operator settings from Netlify env vars into the database, using the
 * service role key (which never reaches the browser).
 *
 *   OPERATOR_EMAILS       → private.operators
 *   HOUSEHOLD_CREATION    → private.app_config
 *   HOUSEHOLD_STORAGE_MB  → private.app_config
 *   OPERATOR_NAME         → private.app_config
 *
 * It takes no input, so calling it can only re-apply what the operator configured.
 * The app calls it once per session; the operator can also open it directly.
 */
import { createClient } from '@supabase/supabase-js';

const MIN_INTERVAL_MS = 60_000;
let lastRun = 0;
let lastResult: Response | null = null;

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { ok: false, error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set' },
      { status: 500 },
    );
  }

  // A warm function instance answers repeat calls from memory.
  if (lastResult && Date.now() - lastRun < MIN_INTERVAL_MS) return lastResult.clone();

  const emails = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
  const config = {
    household_creation: process.env.HOUSEHOLD_CREATION === 'open' ? 'open' : 'invite_only',
    household_storage_mb: String(
      Number.parseInt(process.env.HOUSEHOLD_STORAGE_MB ?? '250', 10) || 250,
    ),
    operator_name: (process.env.OPERATOR_NAME ?? '').slice(0, 120),
  };

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('sync_config', {
    p_operator_emails: emails,
    p_config: config,
  });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  lastRun = Date.now();
  lastResult = Response.json({ ok: true, ...(data as object) });
  return lastResult.clone();
};
