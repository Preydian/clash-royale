import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Battle } from '../lib/api';
import type { Matchup, ModeGroup, Outcome } from '../lib/battles';
import {
  MODE_GROUPS,
  averageElixir,
  averageLevelGap,
  battleDate,
  byDay,
  deckStats,
  games,
  leakGap,
  leaked,
  levelGap,
  matchups,
  me,
  modeGroup,
  modeLabel,
  netTrophies,
  opponentLeaked,
  outcome,
  record,
  streak,
  threeCrowns,
  trophySeries,
  winRate,
} from '../lib/battles';
import { elixir, percent, signed, timeAgo } from '../lib/format';
import { CardArt, Deck } from './Deck';
import { ElixirLeaked } from './ElixirLeaked';
import { Section, Stat, StatGrid } from './Layout';
import { FormLine, RecordBar, ResultMark, formatRecord } from './Results';
import { TrophyChart } from './TrophyChart';

type Filter = 'all' | ModeGroup;

const PLURAL: Record<Outcome, string> = {
  win: 'wins',
  loss: 'losses',
  draw: 'draws',
};

const FORM_LENGTH = 40;
const ROWS_SHOWN = 40;

/**
 * Everything computed from a list of battles. `controls` sits above the mode
 * filter (the player page puts the date range there); `stale` dims the content
 * while a new range loads.
 */
export const BattleAnalysis = ({
  battles,
  commonMax,
  lifetimeWinRate,
  title,
  aside,
  controls,
  showDays = false,
  stale = false,
}: {
  battles: Battle[];
  commonMax: number | null;
  lifetimeWinRate: number | null;
  title: string;
  aside?: React.ReactNode;
  controls?: React.ReactNode;
  showDays?: boolean;
  stale?: boolean;
}) => {
  const [chosen, setFilter] = useState<Filter>('all');
  const [allRows, setAllRows] = useState(false);

  const groups = MODE_GROUPS.map((g) => ({
    ...g,
    count: battles.filter((b) => modeGroup(b) === g.id).length,
  })).filter((g) => g.count > 0);
  // A mode picked in one date range may not exist in the next.
  const filter = groups.some((g) => g.id === chosen) ? chosen : 'all';

  const shown = useMemo(
    () =>
      filter === 'all'
        ? battles
        : battles.filter((b) => modeGroup(b) === filter),
    [battles, filter],
  );
  const rows = allRows ? shown : shown.slice(0, ROWS_SHOWN);

  return (
    <Section title={title} aside={aside}>
      {controls}

      {groups.length > 1 && (
        <div
          role="group"
          aria-label="Filter by mode"
          className="mb-6 flex flex-wrap gap-2"
        >
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All <Count n={battles.length} />
          </FilterButton>
          {groups.map((g) => (
            <FilterButton
              key={g.id}
              active={filter === g.id}
              onClick={() => setFilter(g.id)}
            >
              {g.label} <Count n={g.count} />
            </FilterButton>
          ))}
        </div>
      )}

      {battles.length === 0 ? (
        <p className="text-ink-soft">No battles in this range yet.</p>
      ) : (
        <div
          className={`transition-opacity ${stale ? 'opacity-50' : ''}`}
          aria-busy={stale}
        >
          <Summary battles={shown} lifetimeWinRate={lifetimeWinRate} />

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            {/* Sized to the bars so "latest" sits under the last one. */}
            <div className="w-fit min-w-0 max-w-full">
              <p className="label mb-3">
                Form
                {shown.length > FORM_LENGTH && ` · last ${FORM_LENGTH}`}
              </p>
              <FormLine
                outcomes={shown.slice(0, FORM_LENGTH).reverse().map(outcome)}
              />
              <p className="mt-2 flex justify-between font-mono text-[11px] text-ink-faint">
                <span>older</span>
                <span>latest</span>
              </p>
            </div>
            <TrophySection battles={shown} />
          </div>

          <ElixirLeaked battles={shown} />
          {showDays && <DayByDay battles={shown} />}
          <Decks battles={shown} />
          <Matchups battles={shown} />

          <h3 className="label mb-3 mt-12">Battle by battle</h3>
          <ol className="border-t border-ink">
            {rows.map((b) => (
              <BattleRow
                key={b.battleTime + me(b).tag}
                battle={b}
                commonMax={commonMax}
              />
            ))}
          </ol>
          {rows.length < shown.length && (
            <button
              type="button"
              onClick={() => setAllRows(true)}
              className="mt-4 border-2 border-ink px-4 py-1.5 font-display text-lg font-bold uppercase transition-colors hover:bg-ink hover:text-paper"
            >
              Show all {shown.length} battles
            </button>
          )}
        </div>
      )}
    </Section>
  );
};

const FilterButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`border-2 px-3 py-1 font-display text-lg font-bold uppercase leading-tight transition-colors ${
      active
        ? 'border-ink bg-ink text-paper'
        : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
    }`}
  >
    {children}
  </button>
);

const Count = ({ n }: { n: number }) => (
  <span className="ml-1 font-mono text-xs font-normal opacity-70">{n}</span>
);

const Summary = ({
  battles,
  lifetimeWinRate,
}: {
  battles: Battle[];
  lifetimeWinRate: number | null;
}) => {
  const r = record(battles);
  const rate = winRate(r);
  const current = streak(battles);
  const trophies = netTrophies(battles);
  const crowns = threeCrowns(battles);
  const gap = averageLevelGap(battles);

  return (
    <StatGrid>
      <Stat
        label="Record"
        value={formatRecord(r)}
        note={`${games(r)} battles`}
      />
      <Stat
        label="Win rate"
        value={percent(rate)}
        note={
          lifetimeWinRate === null
            ? undefined
            : `${percent(lifetimeWinRate)} lifetime`
        }
      />
      <Stat
        label="Streak"
        value={
          current ? `${current.outcome[0].toUpperCase()}${current.length}` : '—'
        }
        note={
          current && current.length > 1
            ? `${PLURAL[current.outcome]} in a row`
            : undefined
        }
      />
      <Stat
        label="Trophies"
        value={trophies === null ? '—' : signed(trophies)}
        note={trophies === null ? 'no ladder battles' : 'net, ladder only'}
      />
      <Stat
        label="Three crowns"
        value={crowns}
        note={
          r.wins > 0 ? `${percent((crowns / r.wins) * 100)} of wins` : undefined
        }
      />
      <Stat
        label="Level gap"
        value={gap === null ? '—' : signed(gap, 1)}
        note="your cards vs theirs"
      />
    </StatGrid>
  );
};

const TrophySection = ({ battles }: { battles: Battle[] }) => {
  const points = trophySeries(battles);
  if (points.length < 2) {
    return (
      <p className="self-end text-sm text-ink-soft">
        Play two or more ladder battles to see a trophy chart.
      </p>
    );
  }
  return <TrophyChart points={points} />;
};

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
};

/** One row per day played: a session recap. */
const DayByDay = ({ battles }: { battles: Battle[] }) => {
  const days = byDay(battles);
  if (days.length < 2) return null;

  return (
    <>
      <h3 className="label mb-3 mt-12">Day by day</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="label pb-2 pr-4">
                Day
              </th>
              <th scope="col" className="label pb-2 pr-4 text-right">
                Battles
              </th>
              <th scope="col" className="label pb-2 pr-4 text-right">
                Record
              </th>
              <th scope="col" className="label w-2/5 pb-2 pr-4">
                Win rate
              </th>
              <th scope="col" className="label pb-2 text-right">
                Trophies
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date.toISOString()} className="border-b border-rule">
                <td className="py-2 pr-4 text-sm font-semibold">
                  {d.date.toLocaleDateString(undefined, DAY_FORMAT)}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-sm tabular-nums">
                  {games(d.record)}
                </td>
                <td className="py-2 pr-4 text-right font-display text-xl font-bold tabular-nums">
                  {formatRecord(d.record)}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 shrink-0 text-right font-mono text-sm tabular-nums">
                      {percent(winRate(d.record))}
                    </span>
                    <RecordBar record={d.record} />
                  </div>
                </td>
                <td className="py-2 text-right font-mono text-sm tabular-nums">
                  {d.trophies === null ? '—' : signed(d.trophies)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const Decks = ({ battles }: { battles: Battle[] }) => {
  const decks = deckStats(battles).slice(0, 5);
  if (decks.length === 0) return null;

  return (
    <>
      <h3 className="label mb-3 mt-12">Decks played</h3>
      <ul className="border-t border-ink">
        {decks.map((d) => (
          <li
            key={d.key}
            className="flex flex-col gap-3 border-b border-rule py-3 sm:flex-row sm:items-center sm:gap-6"
          >
            <Deck cards={d.cards} compact />
            <div className="flex flex-1 items-center gap-5">
              <div className="min-w-[5rem] shrink-0 whitespace-nowrap">
                <p className="font-display text-3xl font-extrabold leading-none">
                  {formatRecord(d.record)}
                </p>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {games(d.record)}{' '}
                  {games(d.record) === 1 ? 'battle' : 'battles'}
                </p>
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-sm">
                  <span className="font-semibold">
                    {percent(winRate(d.record))}
                  </span>{' '}
                  <span className="text-ink-soft">
                    win rate · {averageElixir(d.cards)?.toFixed(1) ?? '?'} avg
                    elixir
                  </span>
                </p>
                <RecordBar record={d.record} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

const Matchups = ({ battles }: { battles: Battle[] }) => {
  // Small samples lie; require a card to show up a few times before ranking it.
  const minFaced = battles.length >= 100 ? 5 : battles.length >= 15 ? 3 : 2;
  const all = matchups(battles).filter((m) => m.faced >= minFaced);
  const rate = (m: Matchup) => m.lost / m.faced;

  const trouble = all
    .filter((m) => rate(m) >= 0.5)
    .sort((a, z) => rate(z) - rate(a) || z.faced - a.faced)
    .slice(0, 6);
  const comfortable = all
    .filter((m) => rate(m) < 0.5)
    .sort((a, z) => rate(a) - rate(z) || z.faced - a.faced)
    .slice(0, 6);

  return (
    <div className="mt-12 grid gap-10 md:grid-cols-2">
      <MatchupList
        title="Cards that beat you"
        empty={`No card has beaten you in half of the ${minFaced}+ battles it showed up in.`}
        items={trouble}
      />
      <MatchupList
        title="Cards you handle"
        empty={`Nothing faced ${minFaced}+ times that you beat more often than not.`}
        items={comfortable}
      />
    </div>
  );
};

const MatchupList = ({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Matchup[];
}) => (
  <div>
    <h3 className="label mb-3">{title}</h3>
    {items.length === 0 ? (
      <p className="border-t border-ink pt-3 text-sm text-ink-soft">{empty}</p>
    ) : (
      <ul className="border-t border-ink">
        {items.map((m) => (
          <li
            key={m.card.id}
            className="flex items-center gap-4 border-b border-rule py-2"
          >
            <div className="w-10 shrink-0">
              <CardArt card={m.card} bare />
            </div>
            <div className="flex-1">
              <p className="flex justify-between gap-3 text-sm">
                <span className="font-semibold">{m.card.name}</span>
                <span className="text-ink-soft">
                  lost {m.lost} of {m.faced}
                </span>
              </p>
              <div className="mt-1.5">
                <RecordBar
                  record={{ wins: m.faced - m.lost, losses: m.lost, draws: 0 }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const BattleRow = ({
  battle,
  commonMax,
}: {
  battle: Battle;
  commonMax: number | null;
}) => {
  const you = me(battle);
  const them = battle.opponent[0];
  const result = outcome(battle);
  const gap = levelGap(battle);
  const leak = leaked(battle);
  const notes = [
    gap !== null &&
      `Level gap ${signed(gap, 1)} (your average card level minus theirs)`,
    leakComparison(battle),
  ].filter((note): note is string => Boolean(note));

  return (
    <li className="border-b border-rule">
      <details className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-4 py-3 hover:bg-sheet sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto] [&::-webkit-details-marker]:hidden">
          <ResultMark outcome={result} />
          <span className="font-display text-2xl font-extrabold tabular-nums leading-none">
            {you.crowns}–{them.crowns}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {battle.opponent.map((o) => o.name).join(' & ')}
            </span>
            <span className="block truncate text-[13px] text-ink-soft">
              {modeLabel(battle)} · {timeAgo(battleDate(battle))}
              {them.clan ? ` · ${them.clan.name}` : ''}
            </span>
          </span>
          <span className="text-right tabular-nums">
            {you.trophyChange !== undefined && (
              <span className="block font-mono text-sm">
                {signed(you.trophyChange)}
              </span>
            )}
            {leak !== null && (
              <span className="block whitespace-nowrap text-[13px] text-ink-soft">
                {elixir(leak)} leaked
              </span>
            )}
          </span>
          <span className="hidden md:block">
            <Deck cards={them.cards} compact />
          </span>
          <ChevronDown
            aria-hidden
            className="hidden h-4 w-4 text-ink-faint transition-transform group-open:rotate-180 sm:block"
          />
        </summary>

        <div className="grid gap-6 pb-6 pt-2 md:grid-cols-2">
          {battle.team.map((p) => (
            <Side
              key={p.tag}
              label="You"
              name={p.name}
              cards={p.cards}
              commonMax={commonMax}
              leaked={p.elixirLeaked}
            />
          ))}
          {battle.opponent.map((p) => (
            <Side
              key={p.tag}
              label="Opponent"
              name={p.name}
              cards={p.cards}
              commonMax={commonMax}
              leaked={p.elixirLeaked}
            />
          ))}
          {notes.length > 0 && (
            <div className="space-y-1 text-sm text-ink-soft md:col-span-2">
              {notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          )}
        </div>
      </details>
    </li>
  );
};

/** Your elixir leaked against theirs, when the battle reported both. */
function leakComparison(battle: Battle): string | null {
  const ours = leaked(battle);
  const theirs = opponentLeaked(battle);
  const gap = leakGap(battle);
  if (ours === null || theirs === null || gap === null) return null;

  const verdict =
    gap === 0
      ? 'the same'
      : `${elixir(Math.abs(gap))} ${gap < 0 ? 'less' : 'more'}`;
  // An average of two opponents matches neither one's own number, so name it.
  const reporting = battle.opponent.filter((p) => p.elixirLeaked !== undefined);
  const them = reporting.length > 1 ? 'their average of' : 'their';

  return `You leaked ${elixir(ours)} elixir to ${them} ${elixir(
    theirs,
  )} (${verdict})`;
}

const Side = ({
  label,
  name,
  cards,
  commonMax,
  leaked: leak,
}: {
  label: string;
  name: string;
  cards: Battle['team'][number]['cards'];
  commonMax: number | null;
  leaked?: number;
}) => {
  const avg = averageElixir(cards);
  const meta = [
    avg !== null && `${avg.toFixed(1)} avg elixir`,
    leak !== undefined && `${elixir(leak)} leaked`,
  ].filter(Boolean);
  return (
    <div>
      <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm">
        <span
          className={`h-2 w-2 self-center ${
            label === 'You' ? 'bg-cobalt' : 'bg-vermilion'
          }`}
        />
        <span className="label">{label}</span>
        <span className="font-semibold">{name}</span>
        <span className="text-ink-soft">{meta.join(' · ')}</span>
      </p>
      <Deck cards={cards} commonMax={commonMax} />
    </div>
  );
};
