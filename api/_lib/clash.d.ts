// Types for clash.js, so vite.config.ts can import it.

export type ApiRequest = {
  query: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  send(body: string): void;
};

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<void>;

export function apiBase(fallback?: string): string;
export function normalizeTag(raw: string): string;
export function createClashHandler(base: string): ApiHandler;
