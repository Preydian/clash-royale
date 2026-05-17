import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import { parseDefaultTags } from '../lib/tags';

const PlayerSchema = z.object({
  tag: z.string(),
  name: z.string(),
  trophies: z.number(),
  bestTrophies: z.number(),
  wins: z.number(),
  losses: z.number(),
  clan: z
    .object({
      name: z.string(),
    })
    .optional()
    .nullable(),
});

type Player = z.infer<typeof PlayerSchema>;

type PlayerResult = {
  tag: string;
  data: Player | null;
  error: string | null;
};

const ComparePage: React.FC = () => {
  const [inputTag, setInputTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMyAccounts = () => {
    setTags(parseDefaultTags());
    setResults([]);
  };

  const addTag = () => {
    const cleanTag = inputTag.trim().toUpperCase();
    if (!cleanTag) return;

    const formattedTag = cleanTag.startsWith('#') ? cleanTag : `#${cleanTag}`;

    if (!tags.includes(formattedTag)) {
      setTags([...tags, formattedTag]);
      setInputTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
    setResults((prev) => prev.filter((r) => r.tag !== tagToRemove));
  };

  const fetchAllStats = async () => {
    setLoading(true);

    const fetchPromises = tags.map(async (tag): Promise<PlayerResult> => {
      try {
        const formatted = encodeURIComponent(`%23${tag.slice(1)}`);
        const base = import.meta.env.VITE_API_BASE ?? '';
        const res = await fetch(`${base}/api/player/${formatted}`);

        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'Player Not Found'
              : `API Error (${res.status})`,
          );
        }

        const rawData = await res.json();

        const validation = PlayerSchema.safeParse(rawData);
        if (!validation.success) {
          throw new Error('Invalid Data Format');
        }

        return { tag, data: validation.data, error: null };
      } catch (err) {
        return {
          tag,
          data: null,
          error: err instanceof Error ? err.message : 'Unknown Error',
        };
      }
    });

    const finalResults = await Promise.all(fetchPromises);
    setResults(finalResults);
    setLoading(false);
  };

  const totals = useMemo(() => {
    const validResults = results.filter(
      (r) => r.data !== null && r.error === null,
    );

    return validResults.reduce(
      (acc, curr) => {
        const p = curr.data!;
        return {
          wins: acc.wins + p.wins,
          losses: acc.losses + p.losses,
          trophies: acc.trophies + p.trophies,
          count: acc.count + 1,
        };
      },
      { wins: 0, losses: 0, trophies: 0, count: 0 },
    );
  }, [results]);

  const globalWinRate = useMemo(() => {
    const totalGames = totals.wins + totals.losses;
    if (totalGames === 0) return 0;
    return (totals.wins / totalGames) * 100;
  }, [totals]);

  return (
    <div className="p-8 max-w-6xl mx-auto text-slate-200">
      <h2 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter text-blue-400">
        Multi-Account Sync
      </h2>

      {/* Input Section */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8 shadow-lg">
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 bg-slate-900 border border-slate-700 p-3 rounded-lg outline-none focus:border-blue-500 transition-colors"
            placeholder="Add Tag (e.g. #P9L2...)"
            value={inputTag}
            onChange={(e) => setInputTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
          />
          <button
            onClick={addTag}
            className="bg-slate-700 px-6 rounded-lg font-bold hover:bg-slate-600 transition-colors"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[30px]">
          {tags.map((t) => (
            <span
              key={t}
              className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-sm flex items-center gap-2 animate-in fade-in zoom-in duration-200"
            >
              {t}
              <button
                onClick={() => removeTag(t)}
                className="hover:text-white hover:bg-blue-500/20 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-slate-500 text-sm italic">
              No tags added yet...
            </span>
          )}
        </div>

        {parseDefaultTags().length > 0 && (
          <button
            onClick={loadMyAccounts}
            className="mt-4 w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Load my accounts
          </button>
        )}

        <button
          onClick={fetchAllStats}
          disabled={loading || tags.length === 0}
          className="w-full mt-6 bg-blue-600 p-3 rounded-xl font-black uppercase hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
        >
          {loading ? 'Fetching Data...' : `Fetch All (${tags.length} Accounts)`}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Global Stats Section */}
          {totals.count > 0 && (
            <div className="bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700 shadow-2xl flex flex-col md:flex-row items-center gap-8">
              {/* Changed grid-cols to fit 5 items comfortably on large screens */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
                <StatBox
                  label="Overall Win Rate"
                  value={`${globalWinRate.toFixed(1)}%`}
                  color={
                    globalWinRate >= 50 ? 'text-emerald-400' : 'text-yellow-500'
                  }
                />

                <StatBox
                  label="Total Wins"
                  value={totals.wins}
                  color="text-emerald-400"
                />
                <StatBox
                  label="Total Losses"
                  value={totals.losses}
                  color="text-red-400"
                />
                <StatBox
                  label="Avg Trophies"
                  value={Math.round(totals.trophies / totals.count)}
                  color="text-yellow-400"
                />
                <StatBox
                  label="Valid Accounts"
                  value={`${totals.count}/${results.length}`}
                  color="text-blue-400"
                />
              </div>
            </div>
          )}

          {/* Individual Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((result) => (
              <PlayerCard
                key={result.tag}
                result={result}
                onRemove={removeTag}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">
      {label}
    </p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
  </div>
);

const PlayerCard = ({
  result,
  onRemove,
}: {
  result: PlayerResult;
  onRemove: (tag: string) => void;
}) => {
  const { data, error, tag } = result;

  const totalGames = data ? data.wins + data.losses : 0;
  const winRate = totalGames > 0 && data ? (data.wins / totalGames) * 100 : 0;

  return (
    <div
      className={`relative p-5 rounded-xl border transition-all duration-300 group ${
        error
          ? 'bg-red-900/5 border-red-500/30'
          : 'bg-slate-800 border-slate-700 hover:border-blue-500/50'
      }`}
    >
      <div className="flex justify-between items-center">
        {/* Left Side: Name and Tag */}
        <div>
          {data ? (
            <>
              <h4 className="text-xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                {data.name}
              </h4>
              <p className="text-slate-500 font-mono text-xs">{tag}</p>
              {data.clan && (
                <p className="text-slate-400 text-xs mt-1">
                  🛡️ {data.clan.name}
                </p>
              )}
            </>
          ) : (
            <>
              <h4 className="text-xl font-bold text-slate-400">Unknown</h4>
              <p className="text-red-400 font-mono text-xs">{tag}</p>
            </>
          )}

          {error && (
            <div className="mt-2 inline-flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1 rounded text-xs font-bold border border-red-500/20">
              <span>⚠️ {error}</span>
            </div>
          )}
        </div>

        {/* Right Side: Stats & Actions */}
        <div className="flex items-center gap-4">
          {/* Wins & Losses */}
          {!error && data && (
            <div className="text-right hidden sm:block mr-2">
              <p className="text-emerald-400 text-sm font-bold">
                {data.wins} W
              </p>
              <p className="text-red-400 text-sm font-bold">{data.losses} L</p>
            </div>
          )}

          {/* Win Rate Percentage */}
          {!error && (
            <div
              className={`text-center ${
                winRate >= 50 ? 'text-emerald-400' : 'text-yellow-500'
              }`}
            >
              <span className="text-2xl font-black">{winRate.toFixed(1)}%</span>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Win Rate
              </p>
            </div>
          )}

          {/* Remove Button */}
          <button
            onClick={() => onRemove(tag)}
            className="text-slate-600 hover:text-red-400 hover:bg-slate-700/50 w-8 h-8 rounded-full flex items-center justify-center transition-colors ml-2"
            title="Remove Tag"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export { ComparePage };
