function normalize(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (!t) return '';
  return t.startsWith('#') ? t : `#${t}`;
}

export function parseDefaultTags(): string[] {
  const raw = import.meta.env.VITE_DEFAULT_TAGS ?? '';
  return raw.split(',').map(normalize).filter(Boolean);
}
