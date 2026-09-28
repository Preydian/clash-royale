import type { Card } from './api';

export function cardIcon(card: Card): string | undefined {
  if (card.evolutionLevel && card.iconUrls?.evolutionMedium) {
    return card.iconUrls.evolutionMedium;
  }
  return card.iconUrls?.medium;
}

/**
 * The API reports levels relative to rarity (a max-level legendary is lower
 * than a max-level common). Every rarity's in-game level is its API level plus
 * (common max - its maxLevel), and commons have the highest maxLevel, so any
 * full collection tells us the constant.
 */
export function commonMaxLevel(collection: Card[]): number | null {
  const maxes = collection
    .map((c) => c.maxLevel)
    .filter((m): m is number => m !== undefined);
  return maxes.length === 0 ? null : Math.max(...maxes);
}

export function displayLevel(
  card: Card,
  commonMax: number | null,
): number | null {
  if (commonMax === null || card.level === undefined) return null;
  if (card.maxLevel === undefined) return null;
  return card.level + (commonMax - card.maxLevel);
}
