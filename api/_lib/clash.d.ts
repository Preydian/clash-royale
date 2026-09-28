// Types for clash.js, so vite.config.ts can import it.

export type ClashRequest = { query: Record<string, unknown> };

export type ClashResponse = {
  status(code: number): ClashResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  send(body: string): void;
};

export function createClashHandler(
  apiBase: string,
): (req: ClashRequest, res: ClashResponse) => Promise<void>;
