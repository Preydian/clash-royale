import React, { useState, useMemo } from 'react';
import { z } from 'zod';

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

const StatsPage: React.FC = () => {
  const [tag, setTag] = useState<string>('');
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const winRate = useMemo(() => {
    if (!playerData) return 0;
    const totalGames = playerData.wins + playerData.losses;
    if (totalGames === 0) return 0;
    return (playerData.wins / totalGames) * 100;
  }, [playerData]);

  const getWinRateColor = (rate: number) => {
    if (rate >= 55) return 'text-emerald-400';
    if (rate >= 50) return 'text-blue-400';
    if (rate >= 45) return 'text-yellow-400';
    return 'text-red-400';
  };

  const fetchStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formattedTag = encodeURIComponent(
      tag.startsWith('#') ? `%23${tag.slice(1)}` : `%23${tag}`,
    );

    try {
      const base = import.meta.env.VITE_API_BASE ?? '';
      const response = await fetch(`${base}/api/player/${formattedTag}`);
      if (!response.ok) throw new Error('Player not found');

      const rawData = await response.json();
      const result = PlayerSchema.safeParse(rawData);

      if (!result.success) {
        throw new Error('Data validation failed');
      }

      setPlayerData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching stats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center text-white">
        Player Analytics
      </h2>

      <form onSubmit={fetchStats} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Enter Tag (e.g. #P9L2...)"
          className="flex-1 p-3 rounded bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <button
          disabled={loading}
          className="bg-blue-600 px-6 py-2 rounded font-bold hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {playerData && (
        <div className="grid grid-cols-1 gap-6">
          {/* Main Header Card */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex justify-between items-center shadow-xl">
            <div>
              <h3 className="text-4xl font-black text-white">
                {playerData.name}
              </h3>
              <p className="text-blue-400 font-mono">{playerData.tag}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">
                Win Rate
              </p>
              <p className={`text-4xl font-black ${getWinRateColor(winRate)}`}>
                {winRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Trophies"
              value={playerData.trophies}
              color="text-yellow-400"
            />
            <StatCard
              label="Max"
              value={playerData.bestTrophies}
              color="text-purple-400"
            />
            <StatCard
              label="Wins"
              value={playerData.wins}
              color="text-emerald-400"
            />
            <StatCard
              label="Losses"
              value={playerData.losses}
              color="text-red-400"
            />
          </div>

          {/* Win Rate Progress Bar */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
              <span>Losses</span>
              <span>Overall Performance</span>
              <span>Wins</span>
            </div>
            <div className="w-full h-4 bg-red-500/20 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">
      {label}
    </p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

export { StatsPage };
