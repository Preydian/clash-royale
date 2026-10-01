import React from 'react';
import type { Battle } from '../lib/api';
import type { LeakStats } from '../lib/battles';
import { battleDate, leakStats } from '../lib/battles';
import { elixir, percent, timeAgo } from '../lib/format';
import { Stat, StatGrid } from './Layout';

/** Elixir wasted at a full bar, summarised across a list of battles. */
export const ElixirLeaked = ({ battles }: { battles: Battle[] }) => {
  const stats = leakStats(battles);

  return (
    <>
      <h3 className="label mb-3 mt-12">Elixir leaked</h3>
      {stats === null ? (
        <p className="border-t border-ink pt-3 text-sm text-ink-soft">
          None of these battles reported elixir leaked.
        </p>
      ) : (
        <LeakGrid stats={stats} total={battles.length} />
      )}
    </>
  );
};

const LeakGrid = ({ stats, total }: { stats: LeakStats; total: number }) => {
  // Some modes leave the leak out, so say when an average covers fewer battles.
  const sampled = (label: string, sample: number) =>
    sample === total ? label : `${label}, ${sample} of ${total} battles`;
  const compares = stats.compared > 0;
  const worst = stats.worst.battle;
  const worstNote = [
    `vs ${worst.opponent.map((o) => o.name).join(' & ')}`,
    timeAgo(battleDate(worst)),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <StatGrid>
      <Stat
        label="Per battle"
        value={elixir(stats.average)}
        note={sampled('your average', stats.battles)}
      />
      <Stat
        label="Opponents"
        value={elixir(stats.opponentAverage)}
        note={
          compares
            ? sampled('their average', stats.compared)
            : 'no opponent data'
        }
      />
      <Stat
        label="In wins"
        value={elixir(stats.inWins.average)}
        note={across(stats.inWins.battles, ['win', 'wins'])}
      />
      <Stat
        label="In losses"
        value={elixir(stats.inLosses.average)}
        note={across(stats.inLosses.battles, ['loss', 'losses'])}
      />
      <Stat
        label="Leaked less"
        value={percent(
          compares ? (stats.leakedLess / stats.compared) * 100 : null,
        )}
        note={
          compares
            ? `than them, ${stats.leakedLess} of ${stats.compared} battles`
            : 'no opponent data'
        }
      />
      <Stat
        label="Worst leak"
        value={elixir(stats.worst.leaked)}
        note={worstNote}
      />
    </StatGrid>
  );
};

/** The sample behind an average, e.g. "across 12 wins" or "no losses". */
function across(count: number, [one, many]: [string, string]): string {
  if (count === 0) return `no ${many}`;
  return `across ${count} ${count === 1 ? one : many}`;
}
