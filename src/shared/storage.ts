export interface Progress {
  settings: { sound: boolean };
  market: { served: number; stickers: string[] };
  compass: { found: number; treasures: string[] };
  colors: { painted: number; colours: string[] };
  recipe: { cooked: number; dishes: string[] };
  station: { dispatched: number; stamps: string[] };
  detective: { solved: number; badges: string[] };
  words: { solved: number; badges: string[] };
  garden: { planted: number; flowers: string[] };
}

export const STORAGE_KEY = 'linguaplay.v1';
let sessionProgress: Progress | null = null;

export const defaultProgress = (): Progress => ({
  settings: { sound: true },
  market: { served: 0, stickers: [] },
  compass: { found: 0, treasures: [] },
  colors: { painted: 0, colours: [] },
  recipe: { cooked: 0, dishes: [] },
  station: { dispatched: 0, stamps: [] },
  detective: { solved: 0, badges: [] },
  words: { solved: 0, badges: [] },
  garden: { planted: 0, flowers: [] },
});

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 100) : [];

/** Validates untrusted stored data and fills in defaults. */
export function sanitize(raw: unknown): Progress {
  const d = defaultProgress();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, any>;
  if (typeof r.settings?.sound === 'boolean') d.settings.sound = r.settings.sound;
  d.market = { served: num(r.market?.served), stickers: strs(r.market?.stickers) };
  d.compass = {
    found: num(r.compass?.found),
    treasures: [...new Set(strs(r.compass?.treasures).map((treasure) => treasure === '🪙' ? '💰' : treasure))],
  };
  d.colors = { painted: num(r.colors?.painted), colours: strs(r.colors?.colours) };
  d.recipe = { cooked: num(r.recipe?.cooked), dishes: strs(r.recipe?.dishes) };
  d.station = { dispatched: num(r.station?.dispatched), stamps: strs(r.station?.stamps) };
  d.detective = { solved: num(r.detective?.solved), badges: strs(r.detective?.badges) };
  d.words = { solved: num(r.words?.solved), badges: strs(r.words?.badges) };
  d.garden = { planted: num(r.garden?.planted), flowers: strs(r.garden?.flowers) };
  return d;
}

export function loadProgress(): Progress {
  if (sessionProgress) return sanitize(sessionProgress);
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    sessionProgress = sanitize(text ? JSON.parse(text) : null);
  } catch {
    sessionProgress = defaultProgress();
  }
  return sanitize(sessionProgress);
}

export function saveProgress(p: Progress): void {
  sessionProgress = sanitize(p);
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
  sessionProgress = defaultProgress();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return sanitize(sessionProgress);
}
