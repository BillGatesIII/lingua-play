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

export interface ColorInfo {
  name: Bi;
  hex: string;
  emoji: string;
  simile?: Bi;
  similes?: readonly Bi[];
}

export const COLORS: Record<ColorId, ColorInfo> = {
  red: {
    name: { es: 'rojo', en: 'red' }, hex: '#e03131', emoji: '🔴',
    simile: { es: 'como una fresa 🍓', en: 'like a strawberry 🍓' },
    similes: [
      { es: 'como una fresa 🍓', en: 'like a strawberry 🍓' },
      { es: 'como un camión de bomberos 🚒', en: 'like a fire engine 🚒' },
      { es: 'como una mariquita 🐞', en: 'like a ladybird 🐞' },
    ],
  },
  yellow: {
    name: { es: 'amarillo', en: 'yellow' }, hex: '#ffd23f', emoji: '🟡',
    simile: { es: 'como el sol ☀️', en: 'like the sun ☀️' },
    similes: [
      { es: 'como el sol ☀️', en: 'like the sun ☀️' },
      { es: 'como un limón 🍋', en: 'like a lemon 🍋' },
      { es: 'como un patito 🐥', en: 'like a little duckling 🐥' },
    ],
  },
  blue: {
    name: { es: 'azul', en: 'blue' }, hex: '#1c6dd0', emoji: '🔵',
    simile: { es: 'como el mar 🌊', en: 'like the sea 🌊' },
    similes: [
      { es: 'como el mar 🌊', en: 'like the sea 🌊' },
      { es: 'como una ballena 🐳', en: 'like a whale 🐳' },
      { es: 'como un arándano 🫐', en: 'like a blueberry 🫐' },
    ],
  },
  white: {
    name: { es: 'blanco', en: 'white' }, hex: '#ffffff', emoji: '⚪',
    simile: { es: 'como una nube ☁️', en: 'like a cloud ☁️' },
    similes: [
      { es: 'como una nube ☁️', en: 'like a cloud ☁️' },
      { es: 'como la nieve ❄️', en: 'like snow ❄️' },
    ],
  },
  black: {
    name: { es: 'negro', en: 'black' }, hex: '#232036', emoji: '⚫',
    simile: { es: 'como la noche 🌙', en: 'like the night 🌙' },
    similes: [
      { es: 'como la noche 🌙', en: 'like the night 🌙' },
      { es: 'como el espacio exterior 🌌', en: 'like outer space 🌌' },
    ],
  },
  orange: {
    name: { es: 'naranja', en: 'orange' }, hex: '#f98c1f', emoji: '🟠',
    simile: { es: 'como una calabaza 🎃', en: 'like a pumpkin 🎃' },
    similes: [
      { es: 'como una calabaza 🎃', en: 'like a pumpkin 🎃' },
      { es: 'como una zanahoria 🥕', en: 'like a carrot 🥕' },
      { es: 'como un tigre 🐯', en: 'like a tiger 🐯' },
    ],
  },
  green: {
    name: { es: 'verde', en: 'green' }, hex: '#2f9e44', emoji: '🟢',
    simile: { es: 'como una rana 🐸', en: 'like a frog 🐸' },
    similes: [
      { es: 'como una rana 🐸', en: 'like a frog 🐸' },
      { es: 'como un trébol 🍀', en: 'like a clover 🍀' },
      { es: 'como un cactus del desierto 🌵', en: 'like a desert cactus 🌵' },
    ],
  },
  purple: {
    name: { es: 'morado', en: 'purple' }, hex: '#7048e8', emoji: '🟣',
    simile: { es: 'como una uva 🍇', en: 'like a grape 🍇' },
    similes: [
      { es: 'como una uva 🍇', en: 'like a grape 🍇' },
      { es: 'como la capa de un mago 🧙', en: "like a wizard's cloak 🧙" },
      { es: 'como una berenjena 🍆', en: 'like an aubergine 🍆' },
    ],
  },
  pink: {
    name: { es: 'rosa', en: 'pink' }, hex: '#ff9ecb', emoji: '🌸',
    simile: { es: 'como un flamenco 🦩', en: 'like a flamingo 🦩' },
    similes: [
      { es: 'como un flamenco 🦩', en: 'like a flamingo 🦩' },
      { es: 'como algodón de azúcar 🍬', en: 'like candy floss 🍬' },
      { es: 'como una flor de cerezo 🌸', en: 'like a cherry blossom 🌸' },
    ],
  },
  lightblue: {
    name: { es: 'azul claro', en: 'light blue' }, hex: '#8fd3ff', emoji: '🩵',
    simile: { es: 'como el cielo despejado 🌤️', en: 'like a clear sky 🌤️' },
    similes: [
      { es: 'como el cielo despejado 🌤️', en: 'like a clear sky 🌤️' },
      { es: 'como un cubito de hielo 🧊', en: 'like an ice cube 🧊' },
    ],
  },
  cream: {
    name: { es: 'amarillo claro', en: 'light yellow' }, hex: '#fff3a1', emoji: '🧈',
    simile: { es: 'como la mantequilla 🧈', en: 'like butter 🧈' },
    similes: [
      { es: 'como la mantequilla 🧈', en: 'like butter 🧈' },
      { es: 'como la luz de la luna 🌙', en: 'like moonlight 🌙' },
    ],
  },
  brown: {
    name: { es: 'marrón', en: 'brown' }, hex: '#8d5524', emoji: '🟤',
    simile: { es: 'como el chocolate 🍫', en: 'like chocolate 🍫' },
    similes: [
      { es: 'como el chocolate 🍫', en: 'like chocolate 🍫' },
      { es: 'como un oso del bosque 🐻', en: 'like a forest bear 🐻' },
      { es: 'como una bellota 🌰', en: 'like an acorn 🌰' },
    ],
  },
  grey: {
    name: { es: 'gris', en: 'grey' }, hex: '#9a9aa8', emoji: '🩶',
    simile: { es: 'como un koala 🐨', en: 'like a koala 🐨' },
    similes: [
      { es: 'como un koala 🐨', en: 'like a koala 🐨' },
      { es: 'como un elefante 🐘', en: 'like an elephant 🐘' },
      { es: 'como una nube de tormenta 🌩️', en: 'like a storm cloud 🌩️' },
    ],
  },
  lavender: {
    name: { es: 'lavanda', en: 'lavender' }, hex: '#c4b5fd', emoji: '🪻',
    simile: { es: 'como flores de lavanda 🪻', en: 'like lavender flowers 🪻' },
    similes: [
      { es: 'como flores de lavanda 🪻', en: 'like lavender flowers 🪻' },
      { es: 'como una nube al atardecer 🌇', en: 'like a sunset cloud 🌇' },
    ],
  },
  mint: {
    name: { es: 'verde menta', en: 'mint green' }, hex: '#6ee7b7', emoji: '🌿',
    simile: { es: 'como una hoja de menta 🌿', en: 'like a mint leaf 🌿' },
    similes: [
      { es: 'como una hoja de menta 🌿', en: 'like a mint leaf 🌿' },
      { es: 'como un helado refrescante 🍨', en: 'like cool mint ice cream 🍨' },
    ],
  },
  darkgreen: {
    name: { es: 'verde oscuro', en: 'dark green' }, hex: '#14532d', emoji: '🌲',
    simile: { es: 'como un pino del bosque 🌲', en: 'like a forest pine 🌲' },
    similes: [
      { es: 'como un pino del bosque 🌲', en: 'like a forest pine 🌲' },
      { es: 'como la selva profunda 🌴', en: 'like the deep jungle 🌴' },
    ],
  },
  navy: {
    name: { es: 'azul marino', en: 'navy blue' }, hex: '#1e3a8a', emoji: '🌌',
    simile: { es: 'como el cielo nocturno 🌌', en: 'like the midnight sky 🌌' },
    similes: [
      { es: 'como el cielo nocturno 🌌', en: 'like the midnight sky 🌌' },
      { es: 'como el fondo del océano 🌊', en: 'like the deep ocean 🌊' },
    ],
  },
  maroon: {
    name: { es: 'granate', en: 'maroon' }, hex: '#7f1d1d', emoji: '🍒',
    simile: { es: 'como una cereza oscura 🍒', en: 'like a dark cherry 🍒' },
    similes: [
      { es: 'como una cereza oscura 🍒', en: 'like a dark cherry 🍒' },
      { es: 'como una capa real 👑', en: 'like a royal velvet cloak 👑' },
    ],
  },
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

/** Distinct paint pots needed to mix `color`. */
export function recipePots(color: ColorId): readonly PotId[] {
  const entry = Object.entries(RECIPES).find(([, result]) => result === color);
  return entry ? (entry[0].split('+') as PotId[]) : [];
}

/** Number of distinct paint pots needed to mix `color`. */
export function recipePotCount(color: ColorId): number {
  return recipePots(color).length;
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
  { emoji: '🦎', name: { es: 'Mateo', en: 'Mateo' } },
  { emoji: '🦎', name: { es: 'Lola', en: 'Lola' } },
  { emoji: '🦎', name: { es: 'Kiko', en: 'Kiko' } },
  { emoji: '🦎', name: { es: 'Iris', en: 'Iris' } },
  { emoji: '🦎', name: { es: 'Gala', en: 'Gala' } },
] as const;

export const clueText = (color: ColorId, lang: Lang): string =>
  lang === 'es' ? `Pinta el camaleón de ${COLORS[color].name.es}.` : `Paint the chameleon ${COLORS[color].name.en}.`;

export function playfulClue(
  color: ColorId,
  index: number,
  lang: Lang,
  simileIndex = 0,
  forceSimile = false,
): string {
  const info = COLORS[color];
  const similes = info.similes ?? (info.simile ? [info.simile] : []);
  if ((Math.abs(Math.trunc(index)) % 2 === 1 || forceSimile) && similes.length > 0) {
    const idx = ((Math.trunc(simileIndex) % similes.length) + similes.length) % similes.length;
    const picked = similes[idx];
    return lang === 'es'
      ? `¡Quiero ser ${info.name.es}, ${picked.es}!`
      : `I want to be ${info.name.en}, ${picked.en}!`;
  }
  return clueText(color, lang);
}

export function mixFeedback(color: ColorId, rng: Rng): Bi {
  if (color === 'mud') {
    return pick(rng, [
      { es: '🪨 ¡Ups! Parece una piedra de barro. ¡Prueba otra mezcla!', en: '🪨 Oops! It looks like a mud rock. Try another mix!' },
      { es: '🎨 ¡Qué mezcla tan loca! Vacía un bote y prueba otra vez.', en: '🎨 What a wild mix! Take out a pot and try again.' },
      { es: '🥔 ¡Ja, ja! Ahora el camaleón parece una patata gigante.', en: '🥔 Haha! Now the chameleon looks like a giant potato.' },
      { es: '🌧️ ¡Plof! Eso parece un charco después de llover.', en: '🌧️ Splodge! That looks like a rainy puddle.' },
      { es: '🧪 ¡Poción misteriosa! Mejor quitar un color y probar de nuevo.', en: '🧪 Mystery potion! Better take a colour out and try again.' },
    ]);
  }
  const esName = COLORS[color].name.es;
  const enName = COLORS[color].name.en;
  return pick(rng, [
    { es: `Tu camaleón ahora es ${esName}. ¡Sigue probando!`, en: `Your chameleon is now ${enName}. Keep experimenting!` },
    { es: `¡Ooh, ${esName}! Todavía no es el color que pide, ¡prueba otra mezcla!`, en: `Ooh, ${enName}! Not quite the colour yet — try another mix!` },
    { es: `¡Bonito ${esName}! ¿Qué pasará si cambias un bote?`, en: `Lovely ${enName}! What happens if you swap a pot?` },
    { es: `Ahora brilla en ${esName}, pero busca otro tono.`, en: `Now it glows ${enName}, though it is after a different shade.` },
  ]);
}
