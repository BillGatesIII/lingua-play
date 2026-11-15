import type { Bi, Lang } from '../../shared/i18n';
import { pick, type Rng } from '../../shared/rng';

export type PotId = 'red' | 'yellow' | 'blue' | 'white' | 'black';
export type ColorId =
  | PotId
  | 'orange'
  | 'green'
  | 'purple'
  | 'pink'
  | 'lightblue'
  | 'cream'
  | 'brown'
  | 'grey'
  | 'lavender'
  | 'mint'
  | 'darkgreen'
  | 'navy'
  | 'maroon'
  | 'mud';

export const ROUND_LENGTH = 5;

export interface ColorInfo { name: Bi; hex: string; emoji: string; simile?: Bi }

export const COLORS: Record<ColorId, ColorInfo> = {
  red: { name: { es: 'rojo', en: 'red' }, hex: '#e03131', emoji: '🔴', simile: { es: 'como una fresa 🍓', en: 'like a strawberry 🍓' } },
  yellow: { name: { es: 'amarillo', en: 'yellow' }, hex: '#ffd23f', emoji: '🟡', simile: { es: 'como el sol ☀️', en: 'like the sun ☀️' } },
  blue: { name: { es: 'azul', en: 'blue' }, hex: '#1c6dd0', emoji: '🔵', simile: { es: 'como el mar 🌊', en: 'like the sea 🌊' } },
  white: { name: { es: 'blanco', en: 'white' }, hex: '#ffffff', emoji: '⚪', simile: { es: 'como una nube ☁️', en: 'like a cloud ☁️' } },
  black: { name: { es: 'negro', en: 'black' }, hex: '#232036', emoji: '⚫', simile: { es: 'como la noche 🌙', en: 'like the night 🌙' } },
  orange: { name: { es: 'naranja', en: 'orange' }, hex: '#f98c1f', emoji: '🟠', simile: { es: 'como una calabaza 🎃', en: 'like a pumpkin 🎃' } },
  green: { name: { es: 'verde', en: 'green' }, hex: '#2f9e44', emoji: '🟢', simile: { es: 'como una rana 🐸', en: 'like a frog 🐸' } },
  purple: { name: { es: 'morado', en: 'purple' }, hex: '#7048e8', emoji: '🟣', simile: { es: 'como una uva 🍇', en: 'like a grape 🍇' } },
  pink: { name: { es: 'rosa', en: 'pink' }, hex: '#ff9ecb', emoji: '🌸', simile: { es: 'como un flamenco 🦩', en: 'like a flamingo 🦩' } },
  lightblue: { name: { es: 'azul claro', en: 'light blue' }, hex: '#8fd3ff', emoji: '🩵', simile: { es: 'como el cielo despejado 🌤️', en: 'like a clear sky 🌤️' } },
  cream: { name: { es: 'amarillo claro', en: 'light yellow' }, hex: '#fff3a1', emoji: '🧈', simile: { es: 'como la mantequilla 🧈', en: 'like butter 🧈' } },
  brown: { name: { es: 'marrón', en: 'brown' }, hex: '#8d5524', emoji: '🟤', simile: { es: 'como el chocolate 🍫', en: 'like chocolate 🍫' } },
  grey: { name: { es: 'gris', en: 'grey' }, hex: '#9a9aa8', emoji: '🩶', simile: { es: 'como un koala 🐨', en: 'like a koala 🐨' } },
  lavender: { name: { es: 'lavanda', en: 'lavender' }, hex: '#c4b5fd', emoji: '🪻', simile: { es: 'como flores de lavanda 🪻', en: 'like lavender flowers 🪻' } },
  mint: { name: { es: 'verde menta', en: 'mint green' }, hex: '#6ee7b7', emoji: '🌿', simile: { es: 'como una hoja de menta 🌿', en: 'like a mint leaf 🌿' } },
  darkgreen: { name: { es: 'verde oscuro', en: 'dark green' }, hex: '#14532d', emoji: '🌲', simile: { es: 'como un pino del bosque 🌲', en: 'like a forest pine 🌲' } },
  navy: { name: { es: 'azul marino', en: 'navy blue' }, hex: '#1e3a8a', emoji: '🌌', simile: { es: 'como el cielo nocturno 🌌', en: 'like the midnight sky 🌌' } },
  maroon: { name: { es: 'granate', en: 'maroon' }, hex: '#7f1d1d', emoji: '🍒', simile: { es: 'como una cereza oscura 🍒', en: 'like a dark cherry 🍒' } },
  mud: { name: { es: 'color barro', en: 'muddy brown' }, hex: '#7d6e63', emoji: '🪨' },
};

export const POTS: readonly PotId[] = ['red', 'yellow', 'blue', 'white', 'black'];
export const MAX_POTS = 3;

const TIER_TARGETS: readonly (readonly ColorId[])[] = [
  ['red', 'yellow', 'blue'],
  ['orange', 'green', 'purple'],
  ['pink', 'lightblue', 'cream', 'grey'],
  ['navy', 'maroon', 'pink', 'lightblue'],
  ['brown', 'darkgreen', 'lavender', 'mint'],
];

export const ALL_TARGETS: readonly ColorId[] = [...new Set(TIER_TARGETS.flat())];

const RECIPES: Record<string, ColorId> = {
  red: 'red',
  yellow: 'yellow',
  blue: 'blue',
  white: 'white',
  black: 'black',
  'red+yellow': 'orange',
  'blue+yellow': 'green',
  'blue+red': 'purple',
  'red+white': 'pink',
  'blue+white': 'lightblue',
  'white+yellow': 'cream',
  'black+white': 'grey',
  'black+blue': 'navy',
  'black+red': 'maroon',
  'blue+red+yellow': 'brown',
  'blue+red+white': 'lavender',
  'blue+white+yellow': 'mint',
  'black+blue+yellow': 'darkgreen',
};

/** The colour a bowl of pots makes (order and repeats do not matter). Unmapped mixes are muddy; an empty bowl is null. */
export function mix(pots: readonly PotId[]): ColorId | null {
  if (pots.length === 0) return null;
  const key = [...new Set(pots)].sort().join('+');
  return RECIPES[key] ?? 'mud';
}

/** Tap a pot to put it in the bowl, tap again to take it out. A full bowl drops its oldest pot. */
export function togglePot(bowl: readonly PotId[], pot: PotId, max: number): PotId[] {
  if (bowl.includes(pot)) return bowl.filter((p) => p !== pot);
  return [...bowl, pot].slice(-max);
}

/** One round: 5 chameleons progressing from primaries -> secondaries -> tints -> shades -> 3-pot mixes. */
export function generateRound(rng: Rng): ColorId[] {
  const chosen: ColorId[] = [];
  for (const tier of TIER_TARGETS) {
    const pool = tier.filter((c) => !chosen.includes(c));
    chosen.push(pick(rng, pool));
  }
  return chosen;
}

export const CHAMELEONS = [
  { emoji: '🦎', name: { es: 'Camila el camaleón', en: 'Camila the chameleon' } },
  { emoji: '🦎', name: { es: 'Leo el lagarto', en: 'Leo the lizard' } },
  { emoji: '🦎', name: { es: 'Nori', en: 'Nori' } },
  { emoji: '🦎', name: { es: 'Tito', en: 'Tito' } },
  { emoji: '🦎', name: { es: 'Zoe', en: 'Zoe' } },
] as const;

export const clueText = (color: ColorId, lang: Lang): string =>
  lang === 'es' ? `Pinta el camaleón de ${COLORS[color].name.es}.` : `Paint the chameleon ${COLORS[color].name.en}.`;

export function playfulClue(color: ColorId, index: number, lang: Lang): string {
  const info = COLORS[color];
  if (index % 2 === 1 && info.simile) {
    return lang === 'es'
      ? `¡Quiero ser ${info.name.es}, ${info.simile.es}!`
      : `I want to be ${info.name.en}, ${info.simile.en}!`;
  }
  return clueText(color, lang);
}

export function mixFeedback(color: ColorId, rng: Rng): Bi {
  if (color === 'mud') {
    return pick(rng, [
      { es: '🪨 ¡Ups! Parece una piedra de barro. ¡Prueba otra mezcla!', en: '🪨 Oops! It looks like a mud rock. Try another mix!' },
      { es: '🎨 ¡Qué mezcla tan loca! Vacía un bote y prueba otra vez.', en: '🎨 What a wild mix! Take out a pot and try again.' },
    ]);
  }
  return {
    es: `Tu camaleón ahora es ${COLORS[color].name.es}. ¡Sigue probando!`,
    en: `Your chameleon is now ${COLORS[color].name.en}. Keep experimenting!`,
  };
}
