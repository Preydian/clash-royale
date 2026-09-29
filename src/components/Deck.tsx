import React from 'react';
import type { Card } from '../lib/api';
import { cardIcon, displayLevel } from '../lib/cards';

/** Card image with an optional level/evo caption; `bare` drops the caption. */
export const CardArt = ({
  card,
  level,
  bare = false,
}: {
  card: Card;
  level?: number | null;
  bare?: boolean;
}) => {
  const src = cardIcon(card);
  const evolved = (card.evolutionLevel ?? 0) > 0;
  const caption = bare
    ? ''
    : [evolved && 'Evo', level != null && `Lv${level}`]
        .filter(Boolean)
        .join(' ');

  return (
    <figure className="flex min-w-0 flex-col items-center">
      <div className="aspect-[5/6] w-full">
        {src ? (
          <img
            src={src}
            alt={card.name}
            title={card.name}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border border-rule p-1 text-center text-[10px] leading-tight text-ink-soft">
            {card.name}
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-1 whitespace-nowrap font-mono text-[11px] text-ink-soft">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

/**
 * Eight cards in a row. `commonMax` turns API levels into in-game levels;
 * leave it out to hide levels. `compact` is for inline use in lists.
 */
export const Deck = ({
  cards,
  commonMax,
  compact = false,
}: {
  cards: Card[];
  commonMax?: number | null;
  compact?: boolean;
}) => (
  <ol
    className={
      compact
        ? 'grid w-[232px] shrink-0 grid-cols-8 gap-px'
        : 'grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-8'
    }
  >
    {cards.map((card, i) => (
      <li key={`${card.id}-${i}`}>
        {compact ? (
          <CardArt card={card} bare />
        ) : (
          <CardArt
            card={card}
            level={
              commonMax === undefined ? null : displayLevel(card, commonMax)
            }
          />
        )}
      </li>
    ))}
  </ol>
);
