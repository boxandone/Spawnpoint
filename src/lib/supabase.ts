import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { env, isSupabaseConfigured } from './env';

if (!isSupabaseConfigured && import.meta.env.MODE !== 'test') {
  console.warn('Supabase is not configured. Copy .env.example to .env.local and fill it in.');
}

/**
 * The only Supabase client in the app. Components never import it; each
 * module's api.ts does.
 */
export const supabase = createClient<Database>(
  env.supabaseUrl || 'http://127.0.0.1:54321',
  env.supabaseAnonKey || 'public-anon-key-not-configured',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
