/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** @deprecated legacy anon key, used only when no publishable key is set */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_DEMO_MODE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
