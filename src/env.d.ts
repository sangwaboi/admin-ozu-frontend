/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_BASE_URL: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_WABA_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google Maps API types
declare global {
  interface Window {
    google: typeof google;
  }
}


