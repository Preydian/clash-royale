import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBattleLog, fetchPlayer } from '../lib/api';
import type { Card, Player } from '../lib/api';
import { averageElixir, cycleCost } from '../lib/battles';
import { commonMaxLevel } from '../lib/cards';
import { formatNumber, percent } from '../lib/format';
import { normalizeTag } from '../lib/tags';
import { useAsync } from '../lib/useAsync';
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

const PlayerPage: React.FC = () => {
  const { slug = '' } = useParams();
  const tag = normalizeTag(slug);
  const player = useAsync(() => fetchPlayer(tag), tag);
  const log = useAsync(() => fetchBattleLog(tag), tag);

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
        <BattleAnalysis
          key={tag}
          battles={log.data}
          commonMax={commonMax}
          lifetimeWinRate={winRate}
        />
      )}
    </>
  );
};

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
