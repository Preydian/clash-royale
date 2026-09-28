import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { TrophyPoint } from '../lib/battles';
import { formatNumber, signed, timeAgo } from '../lib/format';

const ink = (name: string) => `rgb(var(--${name}))`;

const TICK_STYLE = {
  fill: ink('ink-soft'),
  fontSize: 11,
  fontFamily: '"Spline Sans Mono", monospace',
};

const OUTCOME_FILL = {
  win: ink('cobalt'),
  loss: ink('vermilion'),
  draw: ink('ink-faint'),
};

// Round tick values (7,600 / 7,650 / …) spanning the data, about four steps.
function niceTicks(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rough = Math.max(max - min, 20) / 4;
  const step =
    [10, 20, 25, 50, 100, 200, 250, 500].find((s) => s >= rough) ?? 1000;
  const ticks = [];
  for (let t = Math.floor(min / step) * step; t <= max + step - 1; t += step) {
    ticks.push(t);
  }
  return ticks;
}

type DotProps = { cx?: number; cy?: number; payload?: TrophyPoint };

const renderDot = (r: number) => {
  const OutcomeDot = ({ cx, cy, payload }: DotProps) =>
    cx === undefined || cy === undefined || !payload ? (
      <g key="empty" />
    ) : (
      <circle
        key={payload.index}
        cx={cx}
        cy={cy}
        r={r}
        fill={OUTCOME_FILL[payload.outcome]}
        stroke={ink('paper')}
        strokeWidth={2}
      />
    );
  return OutcomeDot;
};

const TrophyTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  const point = payload?.[0]?.payload as TrophyPoint | undefined;
  if (!active || !point) return null;

  return (
    <div className="border border-ink bg-sheet px-3 py-2 text-sm shadow-[3px_3px_0_rgb(var(--ink))]">
      <p className="font-display text-2xl font-extrabold leading-none">
        {formatNumber(point.trophies)}
      </p>
      <p className="mt-1 text-ink-soft">
        {signed(point.change)} vs {point.opponent}
      </p>
      <p className="text-ink-faint">{timeAgo(point.date)}</p>
    </div>
  );
};

/** Trophies after each ladder battle, oldest to latest. */
export const TrophyChart = ({ points }: { points: TrophyPoint[] }) => {
  const ticks = niceTicks(points.map((p) => p.trophies));

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
        <span>Trophies after each ladder battle</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cobalt" /> Win
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-vermilion" /> Loss
        </span>
      </figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            // Room on the right for the centred "latest" tick label.
            margin={{ top: 8, right: 28, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke={ink('rule')} />
            <XAxis
              dataKey="index"
              tick={TICK_STYLE}
              tickLine={false}
              axisLine={{ stroke: ink('ink-faint') }}
              tickFormatter={(i: number) =>
                timeAgo(points[i]?.date ?? new Date(NaN))
              }
              interval="preserveStartEnd"
              minTickGap={48}
            />
            <YAxis
              domain={[ticks[0], ticks[ticks.length - 1]]}
              ticks={ticks}
              tick={TICK_STYLE}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatNumber}
              allowDecimals={false}
              width={48}
            />
            <Tooltip
              content={<TrophyTooltip />}
              cursor={{ stroke: ink('ink-faint'), strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="trophies"
              stroke={ink('ink')}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={renderDot(4)}
              activeDot={renderDot(6)}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
};
