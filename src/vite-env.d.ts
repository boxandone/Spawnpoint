/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEV_EMAIL_LOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** The app version from package.json, injected at build time. */
declare const __APP_VERSION__: string;
