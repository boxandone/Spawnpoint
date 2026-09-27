/** Browser-safe configuration. Server-only values live in Netlify Functions. */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  devEmailLogin: import.meta.env.DEV && import.meta.env.VITE_DEV_EMAIL_LOGIN === 'true',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
