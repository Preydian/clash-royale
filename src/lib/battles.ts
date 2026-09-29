import type { Battle, BattlePlayer, Card } from './api';

export type Outcome = 'win' | 'loss' | 'draw';
export type ModeGroup = 'ladder' | 'ranked' | 'war' | 'other';

export const MODE_GROUPS: { id: ModeGroup; label: string }[] = [
  { id: 'ladder', label: 'Ladder' },
  { id: 'ranked', label: 'Ranked' },
  { id: 'war', label: 'War' },
  { id: 'other', label: 'Other' },
];

const TYPE_LABELS: Record<string, string> = {
  PvP: 'Ladder',
  pathOfLegend: 'Ranked',
  riverRacePvP: 'War battle',
  riverRaceDuel: 'War duel',
  riverRaceDuelColosseum: 'War duel',
  boatBattle: 'Boat battle',
  clanMate: 'Clanmate',
  friendly: 'Friendly',
  challenge: 'Challenge',
  tournament: 'Tournament',
  casual1v1: 'Casual',
  casual2v2: 'Casual 2v2',
};

export function modeGroup(battle: Battle): ModeGroup {
  if (battle.type === 'PvP') return 'ladder';
  if (battle.type === 'pathOfLegend') return 'ranked';
  if (/^(riverRace|boatBattle|clanWar)/.test(battle.type)) return 'war';
  return 'other';
}

export function modeLabel(battle: Battle): string {
  return (
    TYPE_LABELS[battle.type] ??
    battle.type
      .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
      .replace(/^./, (c) => c.toUpperCase())
  );
}

export function me(battle: Battle): BattlePlayer {
  return battle.team[0];
}

export function outcome(battle: Battle): Outcome {
  if (battle.type === 'boatBattle' && battle.boatBattleWon !== undefined) {
    return battle.boatBattleWon ? 'win' : 'loss';
  }
  const ours = battle.team[0].crowns;
  const theirs = battle.opponent[0].crowns;
  if (ours > theirs) return 'win';
  if (ours < theirs) return 'loss';
  return 'draw';
}

// "20250928T141502.000Z" -> Date
export function battleDate(battle: Battle): Date {
  const m = battle.battleTime.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
  );
  if (!m) return new Date(NaN);
  const [, y, mo, d, h, mi, s] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

export type Record3 = { wins: number; losses: number; draws: number };

export function record(battles: Battle[]): Record3 {
  const r = { wins: 0, losses: 0, draws: 0 };
  for (const b of battles) {
    const o = outcome(b);
    if (o === 'win') r.wins++;
    else if (o === 'loss') r.losses++;
    else r.draws++;
  }
  return r;
}

// Draws count as games played, matching how the game reports win rate.
export function winRate(r: Record3): number | null {
  const games = r.wins + r.losses + r.draws;
  return games === 0 ? null : (r.wins / games) * 100;
}

/** Current streak from the most recent battle, e.g. { outcome: 'win', length: 4 }. */
export function streak(
  battles: Battle[],
): { outcome: Outcome; length: number } | null {
  if (battles.length === 0) return null;
  const first = outcome(battles[0]);
  let length = 0;
  for (const b of battles) {
    if (outcome(b) !== first) break;
    length++;
  }
  return { outcome: first, length };
}

export function netTrophies(battles: Battle[]): number | null {
  const changes = battles
    .map((b) => me(b).trophyChange)
    .filter((c): c is number => c !== undefined);
  return changes.length === 0 ? null : changes.reduce((a, c) => a + c, 0);
}

export function threeCrowns(battles: Battle[]): number {
  return battles.filter((b) => outcome(b) === 'win' && me(b).crowns === 3)
    .length;
}

export type TrophyPoint = {
  index: number;
  date: Date;
  trophies: number;
  change: number;
  outcome: Outcome;
  opponent: string;
};

/** Trophy count after each ladder battle, oldest first. */
export function trophySeries(battles: Battle[]): TrophyPoint[] {
  return battles
    .filter((b) => me(b).startingTrophies !== undefined)
    .reverse()
    .map((b, index) => {
      const p = me(b);
      const change = p.trophyChange ?? 0;
      return {
        index,
        date: battleDate(b),
        trophies: p.startingTrophies! + change,
        change,
        outcome: outcome(b),
        opponent: b.opponent[0].name,
      };
    });
}

/**
 * Average "levels below max" of a deck. Raw API levels are rarity-relative,
 * but level - maxLevel is comparable across rarities, so the difference between
 * two decks is the real card-level gap without knowing the game's level cap.
 */
function deckLevelOffset(cards: Card[]): number | null {
  const levelled = cards.filter(
    (c) => c.level !== undefined && c.maxLevel !== undefined,
  );
  if (levelled.length === 0) return null;
  const sum = levelled.reduce((a, c) => a + (c.level! - c.maxLevel!), 0);
  return sum / levelled.length;
}

/** Your average card level minus your opponent's, for one battle. */
export function levelGap(battle: Battle): number | null {
  const ours = deckLevelOffset(me(battle).cards);
  const theirs = deckLevelOffset(battle.opponent[0].cards);
  return ours === null || theirs === null ? null : ours - theirs;
}

export function averageLevelGap(battles: Battle[]): number | null {
  const gaps = battles.map(levelGap).filter((g): g is number => g !== null);
  return gaps.length === 0
    ? null
    : gaps.reduce((a, g) => a + g, 0) / gaps.length;
}

export type DeckStats = {
  key: string;
  cards: Card[];
  record: Record3;
  lastPlayed: Date;
};

/** Your decks, grouped by their 8 cards, most-played first. */
export function deckStats(battles: Battle[]): DeckStats[] {
  const decks = new Map<string, { cards: Card[]; battles: Battle[] }>();
  for (const b of battles) {
    const cards = me(b).cards;
    if (cards.length === 0) continue;
    const key = cards
      .map((c) => c.id)
      .sort((a, z) => a - z)
      .join('-');
    const entry = decks.get(key) ?? { cards, battles: [] };
    entry.battles.push(b);
    decks.set(key, entry);
  }

  return [...decks.entries()]
    .map(([key, d]) => ({
      key,
      cards: d.cards,
      record: record(d.battles),
      lastPlayed: battleDate(d.battles[0]),
    }))
    .sort(
      (a, z) =>
        games(z.record) - games(a.record) ||
        z.lastPlayed.getTime() - a.lastPlayed.getTime(),
    );
}

export function games(r: Record3): number {
  return r.wins + r.losses + r.draws;
}

export type Matchup = {
  card: Card;
  faced: number;
  lost: number;
};

/**
 * How you do against each opposing card. With only ~25 battles the sample is
 * small, so callers should show `faced` next to any rate.
 */
export function matchups(battles: Battle[]): Matchup[] {
  const byCard = new Map<number, Matchup>();
  for (const b of battles) {
    const lost = outcome(b) === 'loss';
    // In 2v2 both opponents' cards count, but each card only once per battle.
    const seen = new Set<number>();
    for (const opp of b.opponent) {
      for (const card of opp.cards) {
        if (seen.has(card.id)) continue;
        seen.add(card.id);
        const m = byCard.get(card.id) ?? { card, faced: 0, lost: 0 };
        m.faced++;
        if (lost) m.lost++;
        byCard.set(card.id, m);
      }
    }
  }
  return [...byCard.values()];
}

export function averageElixir(cards: Card[]): number | null {
  const costs = cards
    .map((c) => c.elixirCost)
    .filter((c): c is number => c !== undefined);
  if (costs.length === 0) return null;
  return costs.reduce((a, c) => a + c, 0) / costs.length;
}

/** Cheapest four cards: what it costs to cycle back to a card. */
export function cycleCost(cards: Card[]): number | null {
  const costs = cards
    .map((c) => c.elixirCost)
    .filter((c): c is number => c !== undefined)
    .sort((a, z) => a - z);
  if (costs.length < 8) return null;
  return costs.slice(0, 4).reduce((a, c) => a + c, 0);
}

/** Union of two newest-first battle lists, without duplicates. */
export function mergeBattles(a: Battle[], b: Battle[]): Battle[] {
  const byTime = new Map<string, Battle>();
  for (const battle of [...a, ...b]) byTime.set(battle.battleTime, battle);
  // battleTime strings ("20250928T141502.000Z") sort chronologically.
  return [...byTime.values()].sort((x, y) =>
    y.battleTime.localeCompare(x.battleTime),
  );
}

export type Day = {
  date: Date;
  battles: Battle[];
  record: Record3;
  trophies: number | null;
};

/** Battles grouped by the viewer's local calendar day, newest first. */
export function byDay(battles: Battle[]): Day[] {
  const days = new Map<string, Battle[]>();
  for (const b of battles) {
    const key = battleDate(b).toDateString();
    const day = days.get(key);
    if (day) day.push(b);
    else days.set(key, [b]);
  }
  return [...days.entries()].map(([key, dayBattles]) => ({
    date: new Date(key),
    battles: dayBattles,
    record: record(dayBattles),
    trophies: netTrophies(dayBattles),
  }));
}
