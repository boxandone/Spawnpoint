/**
 * A member's private calendar feed: /.netlify/functions/ics?token=…
 *
 * The token is the only credential. The database keeps just its hash, and an
 * unknown or revoked token gets the same plain 404 as a malformed one. Uses
 * the service role key, which never reaches the browser.
 */
import { createClient } from '@supabase/supabase-js';
import {
  buildEvents,
  feedWindow,
  type CalendarSource,
  type ChoresMode,
} from '../../src/modules/calendar/events';
import { toIcs } from '../../src/modules/calendar/ics';

const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  if (!/^[0-9a-f]{64}$/.test(token)) return notFound();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return new Response('Not configured', { status: 500 });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('ics_feed', { p_token: token });
  if (error) return new Response('Try again later', { status: 503 });
  if (!data) return notFound();

  const feed = data as unknown as CalendarSource & { today: string; chores: ChoresMode };
  const window = feedWindow(feed.today);
  const events = buildEvents(feed, window.from, window.to, feed.chores, window.chores);
  const site = process.env.URL ?? url.origin;
  const body = toIcs(events, {
    name: 'Spawnpoint',
    siteUrl: site,
    now: new Date(),
    host: new URL(site).host,
  });
  return new Response(req.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'private, max-age=900',
      'x-robots-tag': 'noindex',
      'referrer-policy': 'no-referrer',
    },
  });
};
