export function normalizeTag(raw: string): string {
  // Tags never contain the letter O, so a typed O is always meant as zero.
  const t = raw.trim().toUpperCase().replace(/\s+/g, '').replace(/O/g, '0');
  if (!t) return '';
  return t.startsWith('#') ? t : `#${t}`;
}

// '#' starts a URL fragment, so routes carry the tag without it.
export function tagToSlug(tag: string): string {
  return normalizeTag(tag).slice(1);
}

export function parseDefaultTags(): string[] {
  const raw = import.meta.env.VITE_DEFAULT_TAGS ?? '';
  return raw.split(',').map(normalizeTag).filter(Boolean);
}
