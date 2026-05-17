const STORAGE_KEY = 'cr.compare.tags.v1';

function normalize(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (!t) return '';
  return t.startsWith('#') ? t : `#${t}`;
}

export function parseDefaultTags(): string[] {
  const raw = import.meta.env.VITE_DEFAULT_TAGS ?? '';
  return raw.split(',').map(normalize).filter(Boolean);
}

export function loadTags(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((t) => typeof t === 'string')) {
        return parsed as string[];
      }
    }
  } catch {
    // localStorage unavailable or JSON corrupt — fall through to defaults
  }
  return parseDefaultTags();
}

export function saveTags(tags: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // ignore — non-fatal
  }
}
