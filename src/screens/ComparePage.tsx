import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { errorMessage, fetchBattleLog, fetchPlayer } from '../lib/api';
import type { Battle, Player } from '../lib/api';
import { outcome, record, winRate } from '../lib/battles';
import type { Record3 } from '../lib/battles';
import { formatNumber, percent } from '../lib/format';
import { parseDefaultTags, tagToSlug } from '../lib/tags';
import { FormLine, TagSearch, formatRecord } from '../components';

type Row = {
  tag: string;
  player: Player | null;
  battles: Battle[] | null;
  error: string | null;
};

async function loadRow(tag: string): Promise<Row> {
  const [player, battles] = await Promise.allSettled([
    fetchPlayer(tag),
    fetchBattleLog(tag),
  ]);
  if (player.status === 'rejected') {
    return {
      tag,
      player: null,
      battles: null,
      error: errorMessage(player.reason),
    };
  }
  return {
    tag,
    player: player.value,
    battles: battles.status === 'fulfilled' ? battles.value : null,
    error: null,
  };
}

function lifetimeRate(wins: number, losses: number): number | null {
  return wins + losses === 0 ? null : (wins / (wins + losses)) * 100;
}

const ComparePage: React.FC = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const myTags = parseDefaultTags();

  const addTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setRows((prev) => prev.filter((r) => r.tag !== tag));
  };

  const fetchAll = async () => {
    setLoading(true);
    setRows(await Promise.all(tags.map(loadRow)));
    setLoading(false);
  };

  const totals = useMemo(() => {
    const ok = rows.filter((r) => r.player !== null);
    const recent = ok.flatMap((r) => r.battles ?? []);
    return {
      count: ok.length,
      trophies: ok.reduce((a, r) => a + r.player!.trophies, 0),
      wins: ok.reduce((a, r) => a + r.player!.wins, 0),
      losses: ok.reduce((a, r) => a + r.player!.losses, 0),
      recent: recent.length > 0 ? record(recent) : null,
    };
  }, [rows]);

  return (
    <>
      <section className="pt-14 sm:pt-20">
        <h1 className="font-display text-7xl font-black uppercase leading-[0.82] sm:text-8xl">
          Side by side.
        </h1>
        <p className="mb-10 mt-5 max-w-md text-ink-soft">
          Line up several accounts to compare lifetime numbers with how each one
          is playing right now.
        </p>

        <TagSearch buttonLabel="Add" onSubmit={addTag} />

        <ul className="mt-5 flex min-h-[34px] flex-wrap gap-2">
          {tags.map((t) => (
            <li
              key={t}
              className="flex items-center gap-1 border border-ink py-0.5 pl-2.5 pr-1 font-mono text-sm"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`Remove ${t}`}
                className="p-1 text-ink-soft hover:text-vermilion"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {tags.length === 0 && (
            <li className="py-1 text-sm text-ink-faint">No tags added yet.</li>
          )}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchAll}
            disabled={loading || tags.length === 0}
            className="bg-ink px-5 py-2 font-display text-xl font-bold uppercase text-paper transition-colors hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Fetching…' : `Compare ${tags.length || ''} accounts`}
          </button>
          {myTags.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTags(myTags);
                setRows([]);
              }}
              className="border-2 border-ink px-5 py-2 font-display text-xl font-bold uppercase transition-colors hover:bg-ink hover:text-paper"
            >
              Load my accounts
            </button>
          )}
        </div>
      </section>

      {rows.length > 0 && (
        <div
          className={`mt-14 overflow-x-auto transition-opacity ${
            loading ? 'opacity-50' : ''
          }`}
        >
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink">
                <Th>Player</Th>
                <Th right>Trophies</Th>
                <Th right>Best</Th>
                <Th right>Wins</Th>
                <Th right>Losses</Th>
                <Th right>Win rate</Th>
                <Th>Last 25 battles</Th>
                <Th>
                  <span className="sr-only">Remove</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <CompareRow key={r.tag} row={r} onRemove={removeTag} />
              ))}
            </tbody>
            {totals.count > 1 && (
              <tfoot>
                <tr className="border-t-2 border-ink align-top">
                  <td className="py-3 pr-4">
                    <span className="label">All accounts</span>
                    <span className="mt-1 block text-[13px] text-ink-soft">
                      {totals.count} of {rows.length} loaded
                    </span>
                  </td>
                  <Num>
                    {formatNumber(Math.round(totals.trophies / totals.count))}
                    <span className="mt-1 block font-sans text-[13px] font-normal text-ink-soft">
                      average
                    </span>
                  </Num>
                  <Num />
                  <Num>{formatNumber(totals.wins)}</Num>
                  <Num>{formatNumber(totals.losses)}</Num>
                  <Num>
                    {percent(lifetimeRate(totals.wins, totals.losses), 1)}
                  </Num>
                  <td className="py-3 pr-4">
                    {totals.recent && <RecentSummary record={totals.recent} />}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </>
  );
};

const Th = ({
  children,
  right = false,
}: {
  children: React.ReactNode;
  right?: boolean;
}) => (
  <th
    scope="col"
    className={`label pb-2 pr-4 font-bold ${right ? 'text-right' : ''}`}
  >
    {children}
  </th>
);

const Num = ({ children }: { children?: React.ReactNode }) => (
  <td className="py-3 pr-4 text-right font-display text-2xl font-bold tabular-nums leading-none">
    {children}
  </td>
);

const RecentSummary = ({ record: r }: { record: Record3 }) => (
  <span className="text-sm">
    <span className="font-semibold">{formatRecord(r)}</span>{' '}
    <span className="text-ink-soft">({percent(winRate(r))})</span>
  </span>
);

const CompareRow = ({
  row,
  onRemove,
}: {
  row: Row;
  onRemove: (tag: string) => void;
}) => {
  const { player: p, battles, tag } = row;
  const remove = (
    <td className="py-3 text-right">
      <button
        type="button"
        onClick={() => onRemove(tag)}
        aria-label={`Remove ${tag}`}
        className="p-1 text-ink-faint hover:text-vermilion"
      >
        <X className="h-4 w-4" />
      </button>
    </td>
  );

  if (!p) {
    return (
      <tr className="border-b border-rule">
        <td colSpan={7} className="py-3 pr-4">
          <span className="font-mono text-sm">{tag}</span>
          <span className="ml-3 border-l-4 border-vermilion pl-2 text-sm text-ink-soft">
            {row.error}
          </span>
        </td>
        {remove}
      </tr>
    );
  }

  return (
    <tr className="border-b border-rule align-top">
      <td className="py-3 pr-4">
        <Link
          to={`/player/${tagToSlug(tag)}`}
          className="font-display text-2xl font-bold uppercase leading-none underline decoration-rule decoration-2 underline-offset-4 hover:decoration-cobalt"
        >
          {p.name}
        </Link>
        <span className="mt-1 block text-[13px] text-ink-soft">
          <span className="font-mono">{tag}</span>
          {p.clan && ` · ${p.clan.name}`}
        </span>
      </td>
      <Num>{formatNumber(p.trophies)}</Num>
      <Num>{formatNumber(p.bestTrophies)}</Num>
      <Num>{formatNumber(p.wins)}</Num>
      <Num>{formatNumber(p.losses)}</Num>
      <Num>{percent(lifetimeRate(p.wins, p.losses), 1)}</Num>
      <td className="py-3 pr-4">
        {battles && battles.length > 0 ? (
          <>
            <FormLine
              outcomes={[...battles].reverse().map(outcome)}
              size="sm"
            />
            <RecentSummary record={record(battles)} />
          </>
        ) : (
          <span className="text-sm text-ink-faint">
            {battles ? 'No battles' : 'Unavailable'}
          </span>
        )}
      </td>
      {remove}
    </tr>
  );
};

export { ComparePage };
