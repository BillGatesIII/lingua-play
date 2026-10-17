import type { Lang } from './i18n';

export type AgeBand = '7-10' | '11-14';

export interface Progress {
  settings: { lang: Lang; band: AgeBand };
  market: { served: number; stickers: string[] };
  compass: { found: number; treasures: string[] };
}

export const STORAGE_KEY = 'linguaplay.v1';

export const defaultProgress = (): Progress => ({
  settings: { lang: 'es', band: '7-10' },
  market: { served: 0, stickers: [] },
  compass: { found: 0, treasures: [] },
});

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 100) : [];

/** Validates untrusted stored data and fills in defaults. */
export function sanitize(raw: unknown): Progress {
  const d = defaultProgress();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, any>;
  if (r.settings?.lang === 'es' || r.settings?.lang === 'en') d.settings.lang = r.settings.lang;
  if (r.settings?.band === '7-10' || r.settings?.band === '11-14') d.settings.band = r.settings.band;
  d.market = { served: num(r.market?.served), stickers: strs(r.market?.stickers) };
  d.compass = { found: num(r.compass?.found), treasures: strs(r.compass?.treasures) };
  return d;
}

export function loadProgress(): Progress {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return sanitize(text ? JSON.parse(text) : null);
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage may be unavailable (private mode); the game still works */
  }
}

export function updateProgress(fn: (p: Progress) => void): Progress {
  const p = loadProgress();
  fn(p);
  saveProgress(p);
  return p;
}

export function clearProgress(): Progress {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return defaultProgress();
}
