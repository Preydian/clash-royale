import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BattleAnalysis } from '../components/BattleAnalysis';
import type { Battle } from '../lib/api';
import { percent } from '../lib/format';
import { battle } from './fixtures';

function html(battles: Battle[]): string {
  return renderToStaticMarkup(
    <BattleAnalysis
      battles={battles}
      commonMax={null}
      lifetimeWinRate={null}
      title="Last battles"
    />,
  );
}

/** Visible text, one space between elements. */
function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const render = (battles: Battle[]) => text(html(battles));

/** The collapsed line of each battle row, without its expanded details. */
function rows(battles: Battle[]): string[] {
  return [...html(battles).matchAll(/<summary[\s\S]*?<\/summary>/g)].map(
    ([summary]) => text(summary),
  );
}

/** A battle's `battleTime` must be unique: it keys the row. */
const at = (minute: number) => `20250928T14${minute}02.000Z`;

describe('BattleAnalysis elixir leaked', () => {
  const battles = [
    battle({ ours: 1, theirs: [3], crowns: [3, 0], battleTime: at(40) }),
    battle({
      ours: 8.26,
      theirs: [2],
      crowns: [0, 1],
      battleTime: at(30),
      opponentName: 'Leaky',
    }),
    battle({ ours: 3, theirs: [3], crowns: [1, 0], battleTime: at(20) }),
    battle({ crowns: [1, 0], battleTime: at(10) }),
  ];

  it('summarises leaks across the battles', () => {
    const all = render(battles);
    expect(all).toContain('Per battle 4.1 your average, 3 of 4 battles');
    expect(all).toContain('Opponents 2.7 their average, 3 of 4 battles');
    expect(all).toContain('In wins 2.0 across 2 wins');
    expect(all).toContain('In losses 8.3 across 1 loss');
    expect(all).toContain('Leaked less 33% than them, 1 of 3 battles');
    expect(all).toContain('Worst leak 8.3 vs Leaky');
  });

  it('leaves the sample size out when every battle reported a leak', () => {
    const all = render(battles.slice(0, 3));
    expect(all).toContain('Per battle 4.1 your average Opponents');
    expect(all).toContain('Opponents 2.7 their average In wins');
  });

  it('says how many battles the opponents’ average covers', () => {
    const all = render([
      battle({ ours: 10, battleTime: at(30) }),
      battle({ ours: 1, theirs: [2], battleTime: at(20) }),
    ]);
    expect(all).toContain('Per battle 5.5 your average Opponents');
    expect(all).toContain('Opponents 2.0 their average, 1 of 2 battles');
  });

  it('shows your own leak, not theirs, on each collapsed battle row', () => {
    const [first, second, third, unreported] = rows(battles);
    expect(first).toContain('1.0 leaked');
    expect(second).toContain('8.3 leaked');
    expect(third).toContain('3.0 leaked');
    expect(first).not.toContain('3.0 leaked');
    expect(second).not.toContain('2.0 leaked');
    expect(unreported).not.toContain('leaked');
  });

  it('shows the trophy change above the leak on a ladder row', () => {
    const ladder = battle({ ours: 2, theirs: [1] });
    const [row] = rows([
      {
        ...ladder,
        team: ladder.team.map((p) => ({ ...p, trophyChange: 30 })),
      },
    ]);
    expect(row).toContain('+30 2.0 leaked');
  });

  it('compares both sides inside a battle', () => {
    const all = render(battles);
    expect(all).toContain('You leaked 1.0 elixir to their 3.0 (2.0 less)');
    expect(all).toContain('You leaked 8.3 elixir to their 2.0 (6.3 more)');
    expect(all).toContain('You leaked 3.0 elixir to their 3.0 (the same)');
  });

  it('compares against the opponents’ average in a 2v2', () => {
    const all = render([battle({ ours: 5, teammate: 9, theirs: [2, 4] })]);
    expect(all).toContain(
      'You leaked 5.0 elixir to their average of 3.0 (2.0 more)',
    );
  });

  it('does not call one opponent’s leak an average', () => {
    expect(render([battle({ ours: 5, theirs: [undefined, 6] })])).toContain(
      'You leaked 5.0 elixir to their 6.0 (1.0 less)',
    );
  });

  it.each([
    { ours: 2.04, theirs: 1.96 },
    { ours: 1.96, theirs: 2.04 },
  ])(
    'calls $ours against $theirs the same in the row and the totals',
    ({ ours, theirs }) => {
      const all = render([battle({ ours, theirs: [theirs] })]);
      expect(all).toContain('You leaked 2.0 elixir to their 2.0 (the same)');
      expect(all).toContain('Leaked less 0% than them, 0 of 1 battles');
    },
  );

  it('does not compare a boat battle with its defences', () => {
    const all = render([battle({ ours: 3, theirs: [0], type: 'boatBattle' })]);
    expect(all).toContain('Per battle 3.0 your average');
    expect(all).toContain(`Leaked less ${percent(null)} no opponent data`);
    expect(all).not.toContain('You leaked');
  });

  it('keeps the level gap note when no leak was reported', () => {
    const cards = [{ id: 1, name: 'Knight', level: 12, maxLevel: 14 }];
    const levelled = battle();
    const all = render([
      {
        ...levelled,
        team: levelled.team.map((p) => ({ ...p, cards })),
        opponent: levelled.opponent.map((p) => ({ ...p, cards })),
      },
    ]);
    expect(all).toContain('Level gap ±0.0');
    expect(all).not.toContain('You leaked');
  });

  it('says so when no battle reported a leak', () => {
    const all = render([battle(), battle({ battleTime: at(10) })]);
    expect(all).toContain('None of these battles reported elixir leaked.');
    expect(all).not.toMatch(/\d leaked/);
    expect(all).not.toContain('You leaked');
  });

  it('falls back to placeholders when only your side reported a leak', () => {
    const all = render([battle({ ours: 2, crowns: [1, 1] })]);
    const none = percent(null);
    expect(all).toContain(`Opponents ${none} no opponent data`);
    expect(all).toContain(`In wins ${none} no wins`);
    expect(all).toContain(`In losses ${none} no losses`);
    expect(all).toContain(`Leaked less ${none} no opponent data`);
    expect(all).not.toContain('You leaked');
  });
});
