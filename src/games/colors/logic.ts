import type { Bi, Lang } from '../../shared/i18n';
import { shuffle, type Rng } from '../../shared/rng';
import type { ChallengeLevel } from '../../shared/adaptive';

export type PotId = 'red' | 'yellow' | 'blue' | 'white';
export type ColorId = PotId | 'orange' | 'green' | 'purple' | 'pink' | 'lightblue' | 'brown' | 'grey';

export const ROUND_LENGTH = 5;

export interface ColorInfo { name: Bi; hex: string; emoji: string }

export const COLORS: Record<ColorId, ColorInfo> = {
  red: { name: { es: 'rojo', en: 'red' }, hex: '#e03131', emoji: '🔴' },
  yellow: { name: { es: 'amarillo', en: 'yellow' }, hex: '#ffd23f', emoji: '🟡' },
  blue: { name: { es: 'azul', en: 'blue' }, hex: '#1c6dd0', emoji: '🔵' },
  white: { name: { es: 'blanco', en: 'white' }, hex: '#ffffff', emoji: '⚪' },
  orange: { name: { es: 'naranja', en: 'orange' }, hex: '#f98c1f', emoji: '🟠' },
  green: { name: { es: 'verde', en: 'green' }, hex: '#2f9e44', emoji: '🟢' },
  purple: { name: { es: 'morado', en: 'purple' }, hex: '#7048e8', emoji: '🟣' },
  pink: { name: { es: 'rosa', en: 'pink' }, hex: '#ff9ecb', emoji: '🌸' },
  lightblue: { name: { es: 'azul claro', en: 'light blue' }, hex: '#8fd3ff', emoji: '🩵' },
  brown: { name: { es: 'marrón', en: 'brown' }, hex: '#8d5524', emoji: '🟤' },
  grey: { name: { es: 'gris', en: 'grey' }, hex: '#9a9aa8', emoji: '🩶' },
};

const PRIMARIES: PotId[] = ['red', 'yellow', 'blue'];

/** Paint pots and mixing capacity grow with demonstrated confidence. */
export const potsForLevel = (level: ChallengeLevel): PotId[] => (level === 0 ? PRIMARIES : [...PRIMARIES, 'white']);

/** How many pots fit in the mixing bowl at once. */
export const maxPots = (level: ChallengeLevel): number => (level === 0 ? 2 : 3);

/** Colours a chameleon can ask for. */
export const targetsForLevel = (level: ChallengeLevel): ColorId[] =>
  level === 0
    ? ['red', 'yellow', 'blue', 'orange', 'green', 'purple']
    : level === 1
      ? ['red', 'yellow', 'blue', 'white', 'orange', 'green', 'purple', 'pink', 'lightblue']
      : ['red', 'yellow', 'blue', 'white', 'orange', 'green', 'purple', 'pink', 'lightblue', 'brown'];

const RECIPES: Record<string, ColorId> = {
  red: 'red',
  yellow: 'yellow',
  blue: 'blue',
  white: 'white',
  'red+yellow': 'orange',
  'blue+yellow': 'green',
  'blue+red': 'purple',
  'red+white': 'pink',
  'blue+white': 'lightblue',
  'blue+red+yellow': 'brown',
};

/** The colour a bowl of pots makes (order and repeats do not matter). Muddy mixes are grey; an empty bowl is null. */
export function mix(pots: readonly PotId[]): ColorId | null {
  if (pots.length === 0) return null;
  const key = [...new Set(pots)].sort().join('+');
  return RECIPES[key] ?? 'grey';
}

/** Tap a pot to put it in the bowl, tap again to take it out. A full bowl drops its oldest pot. */
export function togglePot(bowl: readonly PotId[], pot: PotId, max: number): PotId[] {
  if (bowl.includes(pot)) return bowl.filter((p) => p !== pot);
  return [...bowl, pot].slice(-max);
}

/** One round: a few different chameleons, in random order. */
export function generateRound(rng: Rng, level: ChallengeLevel): ColorId[] {
  return shuffle(rng, targetsForLevel(level)).slice(0, ROUND_LENGTH);
}

export const clueText = (color: ColorId, lang: Lang): string =>
  lang === 'es' ? `Pinta el camaleón de ${COLORS[color].name.es}.` : `Paint the chameleon ${COLORS[color].name.en}.`;
