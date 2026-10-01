const numberFormat = new Intl.NumberFormat('en-US');

export function formatNumber(n: number): string {
  return numberFormat.format(n);
}

// Stands in for a number there is no data for.
const NO_VALUE = '—';

// Typographic minus, so signed numbers line up and read as numbers.
export function signed(n: number, digits = 0): string {
  const abs = Math.abs(n).toFixed(digits);
  if (Number(abs) === 0) return `±${abs}`;
  return n > 0 ? `+${abs}` : `−${abs}`;
}

export function percent(n: number | null, digits = 0): string {
  return n === null ? NO_VALUE : `${n.toFixed(digits)}%`;
}

/**
 * An elixir amount to one decimal, e.g. "2.4". `leakGap` in battles.ts
 * compares leaks at this same precision.
 */
export function elixir(n: number | null): string {
  return n === null ? NO_VALUE : n.toFixed(1);
}

export function timeAgo(date: Date): string {
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
