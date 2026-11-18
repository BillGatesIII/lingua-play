import type { Bi, Lang } from '../../shared/i18n';
import { joinList, numberWord } from '../../shared/i18n';
import { pick, randInt, shuffle, type Rng } from '../../shared/rng';

export type Dir = 'N' | 'E' | 'S' | 'W';
export interface Pos {
  x: number;
  y: number;
}

/** x grows to the east, y grows to the north; (1,1) is the bottom-left cell. */
export const VECTORS: Record<Dir, Pos> = {
  N: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: -1 },
  W: { x: -1, y: 0 },
};
export const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];
export const DIR_NAMES: Record<Dir, Bi> = {
  N: { es: 'norte', en: 'north' },
  E: { es: 'este', en: 'east' },
  S: { es: 'sur', en: 'south' },
  W: { es: 'oeste', en: 'west' },
};

export interface Landmark {
  emoji: string;
  es: string;
  en: string;
  gender: 'm' | 'f';
}
export const LANDMARKS: readonly Landmark[] = [
  { emoji: '🌴', es: 'palmera', en: 'palm tree', gender: 'f' },
  { emoji: '🗼', es: 'faro', en: 'lighthouse', gender: 'm' },
  { emoji: '⛺', es: 'campamento', en: 'camp', gender: 'm' },
];

export interface Leg {
  dir: Dir;
  n: number;
}
export type Clue =
  | { kind: 'relative'; legs: Leg[] }
  | { kind: 'landmark'; legs: Leg[]; landmark: Landmark }
  | { kind: 'coords'; x: number; y: number }
  | { kind: 'coords-legs'; from: Pos; legs: Leg[] };

export interface Level {
  size: number;
  start: Pos;
  target: Pos;
  landmarkPos?: Pos;
  windPickup?: Pos;
  rocks: Pos[];
  clue: Clue;
  budget: number;
}

export const TREASURES = ['💎', '👑', '🏺', '🗝️', '💰'] as const;
export const JUNK: readonly { emoji: string; es: string; en: string }[] = [
  { emoji: '🥾', es: 'una bota vieja', en: 'an old boot' },
  { emoji: '🦀', es: 'un cangrejo gruñón', en: 'a grumpy crab' },
  { emoji: '🦆', es: 'un patito de goma', en: 'a rubber duck' },
  { emoji: '🧦', es: 'un calcetín mojado', en: 'a soggy sock' },
];
export const VOYAGE_LENGTH = 5;

const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
const inside = (size: number, p: Pos) => p.x >= 1 && p.y >= 1 && p.x <= size && p.y <= size;
export const add = (p: Pos, d: Dir, n = 1): Pos => ({ x: p.x + VECTORS[d].x * n, y: p.y + VECTORS[d].y * n });
export const distance = (a: Pos, b: Pos): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function applyLegs(origin: Pos, legs: readonly Leg[]): Pos {
  return legs.reduce((p, l) => add(p, l.dir, l.n), origin);
}

/** Result of one step; `blocked` means a rock or the edge of the map stopped the boat. */
export function step(level: Level, from: Pos, dir: Dir): { pos: Pos; blocked: boolean } {
  const next = add(from, dir);
  if (!inside(level.size, next) || level.rocks.some((r) => same(r, next))) return { pos: from, blocked: true };
  return { pos: next, blocked: false };
}

/** Shortest number of steps around rocks, or -1 if unreachable. */
export function shortestPath(size: number, rocks: readonly Pos[], from: Pos, to: Pos): number {
  const blocked = new Set(rocks.map((r) => `${r.x},${r.y}`));
  const seen = new Set([`${from.x},${from.y}`]);
  let frontier = [from];
  for (let d = 0; frontier.length; d++) {
    const next: Pos[] = [];
    for (const p of frontier) {
      if (same(p, to)) return d;
      for (const dir of DIRS) {
        const q = add(p, dir);
        const key = `${q.x},${q.y}`;
        if (inside(size, q) && !blocked.has(key) && !seen.has(key)) {
          seen.add(key);
          next.push(q);
        }
      }
    }
    frontier = next;
  }
  return -1;
}

function randomLegs(rng: Rng, count: number, maxN: number): Leg[] {
  let axisX = rng() < 0.5;
  const legs: Leg[] = [];
  for (let i = 0; i < count; i++) {
    legs.push({ dir: pick(rng, axisX ? (['E', 'W'] as Dir[]) : (['N', 'S'] as Dir[])), n: randInt(rng, 1, maxN) });
    axisX = !axisX;
  }
  return legs;
}

const VOYAGE_KINDS: readonly Clue['kind'][] = ['relative', 'relative', 'landmark', 'coords', 'coords-legs'];

/** `index` is the treasure number within a voyage (0-based). Progresses smoothly for ages 8-12. */
export function generateLevel(rng: Rng, index: number): Level {
  const size = 7;
  const kind = VOYAGE_KINDS[index % VOYAGE_KINDS.length];
  const rockCount = 3 + Math.min(index, 4);
  const maxN = index < 2 ? 4 : 5;
  const legCount = index === 0 ? 1 : 2;
  const slack = index < 2 ? 4 : index < 4 ? 3 : 2;

  for (let attempt = 0; attempt < 500; attempt++) {
    const rnd = (): Pos => ({ x: randInt(rng, 1, size), y: randInt(rng, 1, size) });
    const start = rnd();
    let clue: Clue;
    let target: Pos;
    let landmarkPos: Pos | undefined;
    if (kind === 'coords') {
      target = rnd();
      clue = { kind, x: target.x, y: target.y };
    } else if (kind === 'coords-legs') {
      const from = rnd();
      const legs = randomLegs(rng, 2, maxN);
      target = applyLegs(from, legs);
      if (same(from, target)) continue;
      clue = { kind, from, legs };
    } else {
      const legs = randomLegs(rng, legCount, maxN);
      if (kind === 'relative') {
        target = applyLegs(start, legs);
        clue = { kind, legs };
      } else {
        landmarkPos = rnd();
        target = applyLegs(landmarkPos, legs);
        clue = { kind, legs, landmark: pick(rng, LANDMARKS) };
      }
    }
    if (!inside(size, target) || same(target, start)) continue;
    if (landmarkPos && (same(landmarkPos, start) || same(landmarkPos, target))) continue;
    const free = shuffle(rng, Array.from({ length: size * size }, (_, i) => ({ x: (i % size) + 1, y: Math.floor(i / size) + 1 })))
      .filter((p) => !same(p, start) && !same(p, target) && !(landmarkPos && same(p, landmarkPos)));
    const rocks = free.slice(0, rockCount);
    const best = shortestPath(size, rocks, start, target);
    if (best < 0) continue;
    const windCandidate = free[rockCount];
    const windPickup = index >= 1 && windCandidate && shortestPath(size, rocks, start, windCandidate) > 0
      ? windCandidate
      : undefined;
    return { size, start, target, landmarkPos, windPickup, rocks, clue, budget: best + slack };
  }
  throw new Error(`Could not generate a solvable level (index=${index}) after 500 attempts`);
}

const legText = (leg: Leg, lang: Lang): string => {
  const dir = DIR_NAMES[leg.dir][lang];
  const n = numberWord(leg.n, lang);
  if (lang === 'es') return `${n} ${leg.n === 1 ? 'paso' : 'pasos'} al ${dir}`;
  return `${n} ${leg.n === 1 ? 'step' : 'steps'} ${dir}`;
};

export function clueText(clue: Clue, lang: Lang): string {
  if (clue.kind === 'coords') {
    return lang === 'es'
      ? `La X está en x = ${clue.x}, y = ${clue.y}.`
      : `X marks the spot at x = ${clue.x}, y = ${clue.y}.`;
  }
  const list = joinList(clue.legs.map((l) => legText(l, lang)), lang);
  if (clue.kind === 'coords-legs') {
    return lang === 'es'
      ? `Desde x = ${clue.from.x}, y = ${clue.from.y}: ${list}. ¡Cava!`
      : `From x = ${clue.from.x}, y = ${clue.from.y}: ${list}. Dig!`;
  }
  if (clue.kind === 'relative') {
    return lang === 'es' ? `Desde el barco: ${list}. ¡Cava!` : `From the ship: ${list}. Dig!`;
  }
  const lm = clue.landmark;
  return lang === 'es'
    ? `Desde ${lm.gender === 'f' ? 'la' : 'el'} ${lm.es} ${lm.emoji}: ${list}. ¡Cava!`
    : `From the ${lm.en} ${lm.emoji}: ${list}. Dig!`;
}

export type Temperature = 'hot' | 'warm' | 'cold';
export const temperature = (d: number): Temperature => (d <= 1 ? 'hot' : d <= 3 ? 'warm' : 'cold');
export const TEMPERATURE_TEXT: Record<Temperature, Bi> = {
  hot: { es: '¡Caliente! 🔥', en: 'Hot! 🔥' },
  warm: { es: 'Tibio 🌤️', en: 'Warm 🌤️' },
  cold: { es: 'Frío ❄️', en: 'Cold ❄️' },
};

export function temperatureTrend(prevDist: number | null, currDist: number): Bi | null {
  if (prevDist === null) return null;
  if (currDist < prevDist) return { es: '¡Más caliente que antes!', en: 'Warmer than last time!' };
  if (currDist > prevDist) return { es: '¡Más frío que antes!', en: 'Colder than last time!' };
  return { es: '¡Igual de cerca!', en: 'Just as close!' };
}
