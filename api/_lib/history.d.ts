// Types for history.js, so vite.config.ts can import it.
import type { ApiHandler } from './clash.js';

export function trackedTags(): string[];
export function createSyncHandler(base: string): ApiHandler;
export function createHistoryHandler(base: string): ApiHandler;
