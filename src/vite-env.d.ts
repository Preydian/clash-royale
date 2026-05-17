// / <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_DEFAULT_TAGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
