/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute base URL of the Django API, including the `/api` prefix. */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
