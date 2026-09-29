import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBattleLog, fetchHistory, fetchPlayer } from '../lib/api';
import type { Battle, Card, History, Player } from '../lib/api';
import {
  averageElixir,
  battleDate,
  cycleCost,
  mergeBattles,
} from '../lib/battles';
import { commonMaxLevel } from '../lib/cards';
import { formatNumber, percent } from '../lib/format';
import { normalizeTag } from '../lib/tags';
import { useAsync } from '../lib/useAsync';
import type { AsyncState } from '../lib/useAsync';
import {
  BattleAnalysis,
  Deck,
  ErrorNote,
  Loading,
  Section,
  Stat,
  StatGrid,
} from '../components';

function lifetimeWinRate(p: Player): number | null {
  const total = p.wins + p.losses;
  return total === 0 ? null : (p.wins / total) * 100;
}

type Range = 'live' | 'week' | 'month' | 'all';

const RANGES: { id: Range; label: string; days: number | null }[] = [
  { id: 'live', label: 'Last 25', days: null },
  { id: 'week', label: '7 days', days: 7 },
  { id: 'month', label: '30 days', days: 30 },
  { id: 'all', label: 'All time', days: null },
];

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

const PlayerPage: React.FC = () => {
  const { slug = '' } = useParams();
  const tag = normalizeTag(slug);
  // Keyed so moving between players resets ranges, filters and requests.
  return <PlayerView key={tag} tag={tag} />;
};

const PlayerView = ({ tag }: { tag: string }) => {
  const player = useAsync(() => fetchPlayer(tag), tag);
  const log = useAsync(() => fetchBattleLog(tag), tag);
  // 30 days covers the 7- and 30-day views; all time is fetched on demand.
  const recent = useAsync(() => fetchHistory(tag, 30), tag);

  const name = player.status === 'done' ? player.data.name : null;
  useEffect(() => {
    document.title = name ? `${name} · Crown Ledger` : 'Crown Ledger';
  }, [name]);

  if (player.status === 'loading') {
    return <Loading label={`Looking up ${tag}…`} />;
  }
  if (player.status === 'error') {
    return <ErrorNote title={`Couldn’t load ${tag}`} message={player.error} />;
  }

  const p = player.data;
  const commonMax = commonMaxLevel(p.cards ?? []);
  const winRate = lifetimeWinRate(p);

  return (
    <>
      <Profile player={p} winRate={winRate} />

      {p.currentDeck && p.currentDeck.length > 0 && (
        <Section
          title="Current deck"
          aside={<DeckMeta cards={p.currentDeck} />}
        >
          <Deck cards={p.currentDeck} commonMax={commonMax} />
        </Section>
      )}

      {log.status === 'loading' && <Loading label="Reading the battle log…" />}
      {log.status === 'error' && (
        <ErrorNote title="Couldn’t load the battle log" message={log.error} />
      )}
      {log.status === 'done' && (
        <Battles
          tag={tag}
          live={log.data}
          recent={recent}
          commonMax={commonMax}
          lifetimeWinRate={winRate}
        />
      )}
    </>
  );
};

/**
 * The battle analysis over a chosen range: the live log alone, or the live
 * log merged with stored history for tracked players.
 */
const Battles = ({
  tag,
  live,
  recent,
  commonMax,
  lifetimeWinRate,
}: {
  tag: string;
  live: Battle[];
  recent: AsyncState<History>;
  commonMax: number | null;
  lifetimeWinRate: number | null;
}) => {
  const [range, setRange] = useState<Range>('live');
  const allTime = useAsync(
    () => (range === 'all' ? fetchHistory(tag, null) : Promise.resolve(null)),
    `${tag}:${range === 'all'}`,
  );

  const tracked =
    recent.status === 'done' && recent.data.status === 'tracked'
      ? recent.data
      : null;
  const all =
    allTime.status === 'done' && allTime.data?.status === 'tracked'
      ? allTime.data
      : null;

  let battles = live;
  if (tracked && range !== 'live') {
    const stored = range === 'all' && all ? all.battles : tracked.battles;
    const days = RANGES.find((r) => r.id === range)?.days ?? null;
    const cutoff = days === null ? 0 : Date.now() - days * 86_400_000;
    battles = mergeBattles(live, stored).filter(
      (b) => battleDate(b).getTime() > cutoff,
    );
  }

  const since = tracked?.since?.toLocaleDateString(undefined, DATE_FORMAT);
  let aside: string;
  if (recent.status === 'error') {
    aside = `History unavailable: ${recent.error}`;
  } else if (range === 'all' && allTime.status === 'error') {
    aside = `Couldn’t load all time: ${allTime.error}`;
  } else if (!tracked) {
    aside = 'The API keeps about 25 battles';
  } else if (range === 'live') {
    aside = since ? `Tracking since ${since}` : 'Tracking';
  } else {
    aside = since ? `Tracked since ${since}` : '';
  }

  return (
    <BattleAnalysis
      battles={battles}
      commonMax={commonMax}
      lifetimeWinRate={lifetimeWinRate}
      title={
        range === 'live'
          ? `Last ${battles.length} battles`
          : range === 'all'
          ? 'All time'
          : `Past ${RANGES.find((r) => r.id === range)?.days} days`
      }
      aside={aside}
      showDays={range !== 'live'}
      stale={range === 'all' && allTime.status === 'loading'}
      controls={tracked && <RangePicker value={range} onChange={setRange} />}
    />
  );
};

const RangePicker = ({
  value,
  onChange,
}: {
  value: Range;
  onChange: (range: Range) => void;
}) => (
  <div
    role="group"
    aria-label="Date range"
    className="mb-5 flex flex-wrap gap-x-6 gap-y-2"
  >
    {RANGES.map((r) => (
      <button
        key={r.id}
        type="button"
        aria-pressed={value === r.id}
        onClick={() => onChange(r.id)}
        className={`font-display text-xl font-bold uppercase underline-offset-[7px] transition-colors ${
          value === r.id
            ? 'text-ink underline decoration-cobalt decoration-[3px]'
            : 'text-ink-soft hover:text-ink'
        }`}
      >
        {r.label}
      </button>
    ))}
  </div>
);

const Profile = ({
  player: p,
  winRate,
}: {
  player: Player;
  winRate: number | null;
}) => {
  const subline = [
    p.expLevel !== undefined && `King level ${p.expLevel}`,
    p.arena?.name,
    p.clan && `${p.clan.name}${p.role ? ` (${formatRole(p.role)})` : ''}`,
  ].filter(Boolean);

  return (
    <header className="pt-10 sm:pt-14">
      <p className="font-mono text-sm text-ink-soft">{p.tag}</p>
      <h1 className="mt-1 break-words font-display text-6xl font-black uppercase leading-[0.85] sm:text-8xl">
        {p.name}
      </h1>
      <p className="mt-3 text-ink-soft">{subline.join(' · ')}</p>

      <div className="mt-8">
        <StatGrid>
          <Stat label="Trophies" value={formatNumber(p.trophies)} />
          <Stat label="Personal best" value={formatNumber(p.bestTrophies)} />
          <Stat label="Ranked" {...rankedStat(p)} />
          <Stat
            label="Win rate"
            value={percent(winRate, 1)}
            note={`${formatNumber(p.wins)}–${formatNumber(p.losses)} lifetime`}
          />
          <Stat
            label="Three crowns"
            value={
              p.threeCrownWins !== undefined
                ? formatNumber(p.threeCrownWins)
                : '—'
            }
            note="lifetime wins"
          />
          <Stat
            label="Battles"
            value={
              p.battleCount !== undefined ? formatNumber(p.battleCount) : '—'
            }
            note="all modes"
          />
        </StatGrid>
      </div>
    </header>
  );
};

// Path of Legends: a global rank once you're high enough, otherwise a league.
function rankedStat(p: Player): { value: string; note: string } {
  const season = p.currentPathOfLegendSeasonResult;
  if (season?.rank) {
    return {
      value: `#${formatNumber(season.rank)}`,
      note:
        season.trophies !== undefined
          ? `${formatNumber(season.trophies)} rating`
          : 'this season',
    };
  }
  if (season?.leagueNumber !== undefined) {
    return { value: `League ${season.leagueNumber}`, note: 'this season' };
  }
  return { value: '—', note: 'not played this season' };
}

const DeckMeta = ({ cards }: { cards: Card[] }) => {
  const avg = averageElixir(cards);
  const cycle = cycleCost(cards);
  return (
    <>
      {avg !== null && `${avg.toFixed(1)} avg elixir`}
      {cycle !== null && ` · ${cycle} elixir 4-card cycle`}
    </>
  );
};

function formatRole(role: string): string {
  if (role === 'coLeader') return 'co-leader';
  return role.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

export { PlayerPage };
