import React from 'react';
import type { Outcome, Record3 } from '../lib/battles';
import { games } from '../lib/battles';

const OUTCOME_LETTER: Record<Outcome, string> = {
  win: 'W',
  loss: 'L',
  draw: 'D',
};

/** A square result stamp: the letter carries the meaning, the fill echoes it. */
export const ResultMark = ({ outcome }: { outcome: Outcome }) => (
  <span
    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center font-display text-lg font-black leading-none ${
      outcome === 'win'
        ? 'bg-cobalt text-paper'
        : outcome === 'loss'
        ? 'bg-vermilion text-paper'
        : 'border-2 border-ink-faint text-ink-soft'
    }`}
  >
    {OUTCOME_LETTER[outcome]}
  </span>
);

/**
 * Win/loss sparkline: wins rise above the line, losses hang below, draws sit
 * on it. Oldest on the left.
 */
export const FormLine = ({
  outcomes,
  size = 'md',
}: {
  outcomes: Outcome[];
  size?: 'sm' | 'md';
}) => {
  // Bars shrink (down to 3px) when there are more than fit the width.
  const width = size === 'sm' ? 'w-[5px]' : 'w-2';
  const height = size === 'sm' ? 'h-2.5' : 'h-4';
  const summary = outcomes.map((o) => OUTCOME_LETTER[o]).join(' ');

  return (
    <div
      role="img"
      aria-label={`Results, oldest to latest: ${summary}`}
      className="flex items-center gap-[2px] sm:gap-[3px]"
    >
      {outcomes.map((o, i) => (
        <span key={i} className={`flex min-w-[3px] flex-col ${width}`}>
          <span className={`${height} ${o === 'win' ? 'bg-cobalt' : ''}`} />
          <span
            className={`h-px ${o === 'draw' ? 'bg-ink' : 'bg-ink-faint'}`}
          />
          <span className={`${height} ${o === 'loss' ? 'bg-vermilion' : ''}`} />
        </span>
      ))}
    </div>
  );
};

/** Wins vs losses as a two-part bar, with a gap between the parts. */
export const RecordBar = ({ record }: { record: Record3 }) => {
  if (games(record) === 0) return null;
  const segments = [
    { count: record.wins, className: 'bg-cobalt' },
    { count: record.draws, className: 'bg-ink-faint' },
    { count: record.losses, className: 'bg-vermilion' },
  ].filter((s) => s.count > 0);

  return (
    <div
      className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-sm"
      aria-hidden
    >
      {segments.map((s) => (
        <span
          key={s.className}
          className={s.className}
          style={{ flex: `${s.count} 1 0` }}
        />
      ))}
    </div>
  );
};

export function formatRecord(r: Record3): string {
  return r.draws > 0
    ? `${r.wins}–${r.losses}–${r.draws}`
    : `${r.wins}–${r.losses}`;
}
