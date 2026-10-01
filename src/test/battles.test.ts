import { describe, expect, it } from 'vitest';
import {
  averageElixir,
  averageLevelGap,
  leakGap,
  leakStats,
  leaked,
  opponentLeaked,
} from '../lib/battles';
import { battle, player } from './fixtures';

describe('leaked', () => {
  it('is your own elixir leaked', () => {
    expect(leaked(battle({ ours: 2.5, theirs: [7] }))).toBe(2.5);
  });

  it('keeps a perfect zero rather than treating it as missing', () => {
    expect(leaked(battle({ ours: 0 }))).toBe(0);
  });

  it('is null when the battle did not report it', () => {
    expect(leaked(battle())).toBeNull();
  });

  it('leaves a 2v2 teammate’s leak out', () => {
    expect(leaked(battle({ ours: 2, teammate: 9 }))).toBe(2);
    expect(leaked(battle({ teammate: 9 }))).toBeNull();
  });
});

describe('opponentLeaked', () => {
  it('is the opponent’s elixir leaked in a 1v1', () => {
    expect(opponentLeaked(battle({ theirs: [4.2] }))).toBe(4.2);
  });

  it('averages both opponents in a 2v2', () => {
    expect(opponentLeaked(battle({ theirs: [2, 6] }))).toBe(4);
  });

  it('skips an opponent who did not report it', () => {
    expect(opponentLeaked(battle({ theirs: [undefined, 6] }))).toBe(6);
  });

  it('is null when no opponent reported it', () => {
    expect(
      opponentLeaked(battle({ theirs: [undefined, undefined] })),
    ).toBeNull();
  });

  it('is null for a boat battle, which has no opponent playing', () => {
    expect(
      opponentLeaked(battle({ type: 'boatBattle', theirs: [0] })),
    ).toBeNull();
  });
});

describe('leakGap', () => {
  it('is your leak minus theirs', () => {
    expect(leakGap(battle({ ours: 1, theirs: [3] }))).toBe(-2);
    expect(leakGap(battle({ ours: 5.5, theirs: [2] }))).toBe(3.5);
    expect(leakGap(battle({ ours: 3, theirs: [3] }))).toBe(0);
  });

  it('uses the opponents’ average in a 2v2', () => {
    expect(leakGap(battle({ ours: 5, theirs: [2, 4] }))).toBe(2);
  });

  it('is null unless both sides reported a leak', () => {
    expect(leakGap(battle({ ours: 1 }))).toBeNull();
    expect(leakGap(battle({ theirs: [1] }))).toBeNull();
    expect(leakGap(battle())).toBeNull();
  });

  it('compares at the one decimal that is shown, in either direction', () => {
    expect(leakGap(battle({ ours: 1.96, theirs: [2.04] }))).toBe(0);
    expect(leakGap(battle({ ours: 2.04, theirs: [1.96] }))).toBe(0);
    expect(leakGap(battle({ ours: 1.94, theirs: [2.06] }))).toBe(-0.2);
  });

  it('is free of floating point noise', () => {
    expect(leakGap(battle({ ours: 0.3, theirs: [0.1] }))).toBe(0.2);
    expect(leakGap(battle({ ours: 0.1, theirs: [0.3] }))).toBe(-0.2);
  });
});

describe('leakStats', () => {
  it('is null without battles', () => {
    expect(leakStats([])).toBeNull();
  });

  it('is null when no battle reported your leak', () => {
    expect(leakStats([battle({ theirs: [3] }), battle()])).toBeNull();
  });

  it('averages only the battles that reported your leak', () => {
    const stats = leakStats([
      battle({ ours: 1 }),
      battle(),
      battle({ ours: 4 }),
    ]);
    expect(stats?.battles).toBe(2);
    expect(stats?.average).toBe(2.5);
  });

  it('counts a zero leak as a reported battle', () => {
    const stats = leakStats([battle({ ours: 0 }), battle({ ours: 3 })]);
    expect(stats?.battles).toBe(2);
    expect(stats?.average).toBe(1.5);
  });

  it('averages the opponents over the battles where both sides reported', () => {
    const stats = leakStats([
      battle({ ours: 1, theirs: [2] }),
      battle({ ours: 1, theirs: [4, 8] }),
      battle({ ours: 1 }),
      // Not comparable: your own leak is missing.
      battle({ theirs: [100] }),
    ]);
    expect(stats?.opponentAverage).toBe(4);
  });

  it('has no opponent average when no opponent reported a leak', () => {
    const stats = leakStats([battle({ ours: 1 })]);
    expect(stats?.opponentAverage).toBeNull();
    expect(stats?.compared).toBe(0);
    expect(stats?.leakedLess).toBe(0);
  });

  it('splits your average by wins and losses, leaving draws out', () => {
    const stats = leakStats([
      battle({ ours: 1, crowns: [3, 0] }),
      battle({ ours: 2, crowns: [1, 0] }),
      battle({ ours: 6, crowns: [0, 1] }),
      battle({ ours: 50, crowns: [1, 1] }),
    ]);
    expect(stats?.inWins).toEqual({ average: 1.5, battles: 2 });
    expect(stats?.inLosses).toEqual({ average: 6, battles: 1 });
  });

  it('only counts wins and losses that reported your leak', () => {
    const stats = leakStats([
      battle({ ours: 4, crowns: [2, 0] }),
      battle({ crowns: [2, 0] }),
      battle({ crowns: [0, 2] }),
    ]);
    expect(stats?.inWins).toEqual({ average: 4, battles: 1 });
    expect(stats?.inLosses).toEqual({ average: null, battles: 0 });
  });

  it('has no win or loss average without wins or losses', () => {
    const draw = leakStats([battle({ ours: 2, crowns: [1, 1] })]);
    expect(draw?.inWins).toEqual({ average: null, battles: 0 });
    expect(draw?.inLosses).toEqual({ average: null, battles: 0 });
  });

  it('agrees with leakGap about a difference that rounds away', () => {
    const stats = leakStats([battle({ ours: 1.96, theirs: [2.04] })]);
    expect(stats?.leakedLess).toBe(0);
    expect(stats?.compared).toBe(1);
  });

  it('keeps your leak from a boat battle but compares it with nobody', () => {
    const stats = leakStats([
      battle({ ours: 4, theirs: [0], type: 'boatBattle' }),
      battle({ ours: 2, theirs: [6] }),
    ]);
    expect(stats?.battles).toBe(2);
    expect(stats?.average).toBe(3);
    expect(stats?.opponentAverage).toBe(6);
    expect(stats?.leakedLess).toBe(1);
    expect(stats?.compared).toBe(1);
  });

  it('reads your own leak in a 2v2, not your teammate’s', () => {
    const stats = leakStats([
      battle({ ours: 2, teammate: 10, theirs: [3, 5] }),
    ]);
    expect(stats?.average).toBe(2);
    expect(stats?.opponentAverage).toBe(4);
    expect(stats?.worst.leaked).toBe(2);
  });

  it('counts the battles where you leaked less than the other side', () => {
    const stats = leakStats([
      battle({ ours: 1, theirs: [2] }),
      battle({ ours: 5, theirs: [2] }),
      // A tie is not leaking less.
      battle({ ours: 3, theirs: [3] }),
      // Neither of these can be compared.
      battle({ ours: 0 }),
      battle({ theirs: [9] }),
    ]);
    expect(stats?.leakedLess).toBe(1);
    expect(stats?.compared).toBe(3);
  });

  it('finds the battle where you leaked the most', () => {
    const worst = battle({ ours: 9.5, opponentName: 'Worst' });
    const stats = leakStats([battle({ ours: 1 }), worst, battle({ ours: 4 })]);
    expect(stats?.worst).toEqual({ battle: worst, leaked: 9.5 });
  });

  it('keeps the most recent battle when the worst leak is tied', () => {
    const recent = battle({ ours: 7, opponentName: 'Recent' });
    const older = battle({ ours: 7, opponentName: 'Older' });
    expect(leakStats([recent, older])?.worst.battle).toBe(recent);
  });

  it('does not change the battles it is given', () => {
    const battles = [battle({ ours: 3 }), battle({ ours: 1 })];
    const before = structuredClone(battles);
    leakStats(battles);
    expect(battles).toEqual(before);
  });
});

describe('averageElixir', () => {
  it('averages the cards that have a cost', () => {
    const cards = [
      { id: 1, name: 'Knight', elixirCost: 3 },
      { id: 2, name: 'Golem', elixirCost: 8 },
      { id: 3, name: 'Mirror' },
    ];
    expect(averageElixir(cards)).toBe(5.5);
  });

  it('is null when no card has a cost', () => {
    expect(averageElixir([])).toBeNull();
    expect(averageElixir([{ id: 3, name: 'Mirror' }])).toBeNull();
  });
});

describe('averageLevelGap', () => {
  const deck = (level: number) => [
    { id: 1, name: 'Knight', level, maxLevel: 14 },
  ];
  const levelled = (ours: number, theirs: number) => ({
    ...battle(),
    team: [player({ cards: deck(ours) })],
    opponent: [player({ cards: deck(theirs) })],
  });

  it('averages the gap over the battles that have card levels', () => {
    expect(
      averageLevelGap([levelled(14, 12), levelled(11, 12), battle()]),
    ).toBe(0.5);
  });

  it('is null when no battle has card levels', () => {
    expect(averageLevelGap([])).toBeNull();
    expect(averageLevelGap([battle()])).toBeNull();
  });
});
