import { z } from 'zod';

// Schemas are deliberately lenient: the API adds and drops fields between
// seasons, and one odd battle shouldn't take down the whole page.

const CardSchema = z.object({
  id: z.number(),
  name: z.string(),
  level: z.number().optional(),
  maxLevel: z.number().optional(),
  elixirCost: z.number().optional(),
  evolutionLevel: z.number().optional(),
  iconUrls: z
    .object({
      medium: z.string().optional(),
      evolutionMedium: z.string().optional(),
    })
    .optional(),
});

const ClanRefSchema = z.object({
  tag: z.string().optional(),
  name: z.string(),
});

const PathOfLegendResultSchema = z.object({
  leagueNumber: z.number().optional(),
  trophies: z.number().optional(),
  rank: z.number().nullable().optional(),
});

const PlayerSchema = z.object({
  tag: z.string(),
  name: z.string(),
  expLevel: z.number().optional(),
  trophies: z.number(),
  bestTrophies: z.number(),
  wins: z.number(),
  losses: z.number(),
  battleCount: z.number().optional(),
  threeCrownWins: z.number().optional(),
  arena: z.object({ name: z.string() }).optional(),
  clan: ClanRefSchema.nullable().optional(),
  role: z.string().optional(),
  currentDeck: z.array(CardSchema).optional(),
  cards: z.array(CardSchema).optional(),
  currentPathOfLegendSeasonResult:
    PathOfLegendResultSchema.nullable().optional(),
  bestPathOfLegendSeasonResult: PathOfLegendResultSchema.nullable().optional(),
});

const BattlePlayerSchema = z.object({
  tag: z.string(),
  name: z.string(),
  crowns: z.number().default(0),
  startingTrophies: z.number().optional(),
  trophyChange: z.number().optional(),
  elixirLeaked: z.number().optional(),
  clan: ClanRefSchema.nullable().optional(),
  cards: z.array(CardSchema).default([]),
});

const BattleSchema = z.object({
  type: z.string(),
  battleTime: z.string(),
  gameMode: z.object({ name: z.string() }).optional(),
  boatBattleWon: z.boolean().optional(),
  team: z.array(BattlePlayerSchema).min(1),
  opponent: z.array(BattlePlayerSchema).min(1),
});

export type Card = z.infer<typeof CardSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type BattlePlayer = z.infer<typeof BattlePlayerSchema>;
export type Battle = z.infer<typeof BattleSchema>;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function describeStatus(status: number): string {
  switch (status) {
    case 400:
      return 'That doesn’t look like a valid tag';
    case 403:
      return 'The API key was rejected — check CLASH_KEY and its IP whitelist';
    case 404:
      return 'No player with that tag';
    case 429:
      return 'Rate limited by the Clash API — try again in a moment';
    case 500:
      return 'The API server isn’t configured — is CLASH_KEY set?';
    case 503:
      return 'The Clash API is down for maintenance';
    default:
      return `API error (${status})`;
  }
}

async function clashGet(path: string): Promise<unknown> {
  const base = import.meta.env.VITE_API_BASE ?? '';
  const res = await fetch(`${base}/api/clash?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new ApiError(res.status, describeStatus(res.status));
  // Something other than the API answered (e.g. a dev server serving files).
  if (!res.headers.get('Content-Type')?.includes('application/json')) {
    throw new ApiError(0, 'The API server didn’t respond with data');
  }
  return res.json();
}

export async function fetchPlayer(tag: string): Promise<Player> {
  const result = PlayerSchema.safeParse(await clashGet(`players/${tag}`));
  if (!result.success) throw new ApiError(0, 'Unexpected player data');
  return result.data;
}

export async function fetchBattleLog(tag: string): Promise<Battle[]> {
  const raw = await clashGet(`players/${tag}/battlelog`);
  if (!Array.isArray(raw)) throw new ApiError(0, 'Unexpected battle log data');

  return raw.flatMap((item) => {
    const result = BattleSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}
