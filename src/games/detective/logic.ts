import { joinList, type Bi, type Lang } from '../../shared/i18n';
import { pick, randInt, shuffle, type Rng } from '../../shared/rng';

export type HatKind = 'cap' | 'crown' | 'none';
export type SnackKind = 'apple' | 'cheese' | 'carrot';
export type HabitatKind = 'water' | 'land';

export interface AnimalInfo {
  emoji: string;
  name: Bi;
  habitat: HabitatKind;
}

export const ANIMALS: readonly AnimalInfo[] = [
  { emoji: '🐸', name: { es: 'rana', en: 'frog' }, habitat: 'water' },
  { emoji: '🐙', name: { es: 'pulpo', en: 'octopus' }, habitat: 'water' },
  { emoji: '🐧', name: { es: 'pingüino', en: 'penguin' }, habitat: 'water' },
  { emoji: '🐬', name: { es: 'delfín', en: 'dolphin' }, habitat: 'water' },
  { emoji: '🐳', name: { es: 'ballena', en: 'whale' }, habitat: 'water' },
  { emoji: '🐢', name: { es: 'tortuga', en: 'turtle' }, habitat: 'water' },
  { emoji: '🦊', name: { es: 'zorro', en: 'fox' }, habitat: 'land' },
  { emoji: '🦉', name: { es: 'búho', en: 'owl' }, habitat: 'land' },
  { emoji: '🐻', name: { es: 'oso', en: 'bear' }, habitat: 'land' },
  { emoji: '🦁', name: { es: 'león', en: 'lion' }, habitat: 'land' },
  { emoji: '🐰', name: { es: 'conejo', en: 'rabbit' }, habitat: 'land' },
  { emoji: '🐼', name: { es: 'panda', en: 'panda' }, habitat: 'land' },
  { emoji: '🐨', name: { es: 'koala', en: 'koala' }, habitat: 'land' },
  { emoji: '🐘', name: { es: 'elefante', en: 'elephant' }, habitat: 'land' },
];

export const SUSPECT_NAMES = [
  'Coco', 'Milo', 'Nora', 'Toby', 'Lula', 'Paco', 'Kiko', 'Vera',
  'Bruno', 'Maya', 'Leo', 'Alma', 'Félix', 'Sofía', 'Gala', 'Hugo',
] as const;

export const HATS: Record<HatKind, { emoji: string; name: Bi }> = {
  cap: { emoji: '🧢', name: { es: 'gorra', en: 'a cap' } },
  crown: { emoji: '🎩', name: { es: 'sombrero', en: 'a top hat' } },
  none: { emoji: '', name: { es: 'sin gorro', en: 'no hat' } },
};

export const SNACKS: Record<SnackKind, { emoji: string; es: string; en: string }> = {
  apple: { emoji: '🍎', es: 'manzana', en: 'apple' },
  cheese: { emoji: '🧀', es: 'queso', en: 'cheese' },
  carrot: { emoji: '🥕', es: 'zanahoria', en: 'carrot' },
};

export const MYSTERIES: readonly { emoji: string; name: string; prompt: Bi }[] = [
  { emoji: '🍪', name: 'cookies', prompt: { es: '¿Quién se comió las galletas?', en: 'Who ate the cookies?' } },
  { emoji: '🍍', name: 'golden pineapple', prompt: { es: '¿Quién escondió la piña dorada?', en: 'Who hid the golden pineapple?' } },
  { emoji: '🔑', name: 'secret key', prompt: { es: '¿Quién tiene la llave secreta?', en: 'Who has the secret key?' } },
  { emoji: '🎸', name: 'guitar', prompt: { es: '¿Quién tocó la guitarra de noche?', en: 'Who played the guitar at night?' } },
  { emoji: '👑', name: 'royal crown', prompt: { es: '¿Quién probó la corona real?', en: 'Who tried on the royal crown?' } },
  { emoji: '🎂', name: 'birthday cake', prompt: { es: '¿Quién dio un mordisco a la tarta?', en: 'Who took a bite of the birthday cake?' } },
  { emoji: '🗺️', name: 'treasure map', prompt: { es: '¿Quién tomó prestado el mapa secreto?', en: 'Who borrowed the secret map?' } },
  { emoji: '🎩', name: 'magic hat', prompt: { es: '¿Quién sacó un conejo del sombrero mágico?', en: 'Who pulled a rabbit from the magic hat?' } },
  { emoji: '💎', name: 'sparkling diamond', prompt: { es: '¿Quién cambió el diamante por un caramelo?', en: 'Who swapped the diamond for a sweet?' } },
  { emoji: '🎺', name: 'golden trumpet', prompt: { es: '¿Quién despertó al barrio con la trompeta?', en: 'Who woke the street with the trumpet?' } },
  { emoji: '🎨', name: 'paint palette', prompt: { es: '¿Quién pintó lunares en el buzón?', en: 'Who painted polka dots on the postbox?' } },
  { emoji: '🛸', name: 'toy spaceship', prompt: { es: '¿Quién voló la nave espacial de juguete?', en: 'Who flew the toy spaceship?' } },
  { emoji: '📚', name: 'mystery book', prompt: { es: '¿Quién escondió el último capítulo del libro?', en: 'Who hid the final chapter of the book?' } },
  { emoji: '🧸', name: 'teddy bear', prompt: { es: '¿Quién llevó al osito de paseo en patinete?', en: 'Who took the teddy bear for a scooter ride?' } },
  { emoji: '🔔', name: 'station bell', prompt: { es: '¿Quién tocó la campana de la estación?', en: 'Who rang the station bell?' } },
];

export const CASES_PER_ROUND = 5;

export interface Suspect {
  id: string;
  name: string;
  animal: AnimalInfo;
  hat: HatKind;
  glasses: boolean;
  snack: SnackKind;
  badge: number;
}

export type CluePredicate =
  | { kind: 'glasses'; value: boolean }
  | { kind: 'hat'; value: HatKind }
  | { kind: 'not-hat'; value: Exclude<HatKind, 'none'> }
  | { kind: 'snack'; value: SnackKind }
  | { kind: 'not-snack'; value: SnackKind }
  | { kind: 'habitat'; value: HabitatKind }
  | { kind: 'even'; value: boolean }
  | { kind: 'gt'; threshold: number }
  | { kind: 'lt'; threshold: number };

export interface CaseFile {
  mystery: { emoji: string; prompt: Bi };
  suspects: Suspect[];
  culpritId: string;
  clues: CluePredicate[];
}

export function matchesPredicate(s: Suspect, p: CluePredicate): boolean {
  switch (p.kind) {
    case 'glasses': return s.glasses === p.value;
    case 'hat': return s.hat === p.value;
    case 'not-hat': return s.hat !== p.value;
    case 'snack': return s.snack === p.value;
    case 'not-snack': return s.snack !== p.value;
    case 'habitat': return s.animal.habitat === p.value;
    case 'even': return (s.badge % 2 === 0) === p.value;
    case 'gt': return s.badge > p.threshold;
    case 'lt': return s.badge < p.threshold;
  }
}

function candidatePredicates(culprit: Suspect, index: number): CluePredicate[] {
  const simple: CluePredicate[] = [
    { kind: 'glasses', value: culprit.glasses },
    { kind: 'hat', value: culprit.hat },
    { kind: 'snack', value: culprit.snack },
    { kind: 'habitat', value: culprit.animal.habitat },
  ];
  const richer: CluePredicate[] = [
    { kind: 'even', value: culprit.badge % 2 === 0 },
    ...(culprit.badge > 3 ? [{ kind: 'gt', threshold: culprit.badge - randInt(() => 0.5, 1, 2) } as CluePredicate] : []),
    ...(culprit.badge < 7 ? [{ kind: 'lt', threshold: culprit.badge + 2 } as CluePredicate] : []),
  ];
  for (const h of ['cap', 'crown'] as const) {
    if (culprit.hat !== h) richer.push({ kind: 'not-hat', value: h });
  }
  for (const sn of ['apple', 'cheese', 'carrot'] as const) {
    if (culprit.snack !== sn) richer.push({ kind: 'not-snack', value: sn });
  }
  return index < 2 ? [...simple, ...richer] : [...richer, ...simple];
}

function findUniqueClues(suspects: Suspect[], culprit: Suspect, rng: Rng, index: number): CluePredicate[] | null {
  const pool = shuffle(rng, candidatePredicates(culprit, index));
  const maxClues = index < 2 ? 2 : 3;

  // Prefer 2-clue or 3-clue combinations where every clue is genuinely needed (non-redundant when possible).
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const pair = [pool[i], pool[j]];
      const hits = suspects.filter((s) => pair.every((c) => matchesPredicate(s, c)));
      if (hits.length === 1 && hits[0].id === culprit.id && maxClues === 2) return pair;
      if (maxClues === 3) {
        for (let k = j + 1; k < pool.length; k++) {
          const triple = [pool[i], pool[j], pool[k]];
          const hits3 = suspects.filter((s) => triple.every((c) => matchesPredicate(s, c)));
          if (hits3.length === 1 && hits3[0].id === culprit.id) return triple;
        }
      }
    }
  }
  return null;
}

/** Generates a case with 4 suspects (rounds 0-1) or 6 suspects (rounds 2-4) and a unique culprit. */
export function generateCase(
  rng: Rng,
  index: number,
  mysteryOverride?: (typeof MYSTERIES)[number],
): CaseFile {
  const count = index < 2 ? 4 : 6;
  const mystery = mysteryOverride ?? MYSTERIES[index % MYSTERIES.length];

  for (let attempt = 0; attempt < 200; attempt++) {
    const animals = shuffle(rng, ANIMALS).slice(0, count);
    const names = shuffle(rng, SUSPECT_NAMES).slice(0, count);
    const badges = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, count);
    const suspects: Suspect[] = animals.map((animal, idx) => ({
      id: `s-${idx}`,
      name: names[idx],
      animal,
      hat: pick(rng, ['cap', 'crown', 'none'] as const),
      glasses: rng() < 0.5,
      snack: pick(rng, ['apple', 'cheese', 'carrot'] as const),
      badge: badges[idx],
    }));

    const culprit = suspects[0];
    const clues = findUniqueClues(suspects, culprit, rng, index);
    if (!clues) continue;
    return {
      mystery,
      suspects: shuffle(rng, suspects),
      culpritId: culprit.id,
      clues,
    };
  }
  throw new Error(`Could not generate unique detective case (index=${index})`);
}

export function predicateText(p: CluePredicate, lang: Lang): string {
  switch (p.kind) {
    case 'glasses':
      return p.value
        ? (lang === 'es' ? 'lleva gafas 👓' : 'wears glasses 👓')
        : (lang === 'es' ? 'no lleva gafas 👓' : 'does not wear glasses 👓');
    case 'hat':
      if (p.value === 'none') return lang === 'es' ? 'no lleva ningún gorro' : 'wears no hat';
      return lang === 'es'
        ? `lleva ${HATS[p.value].name.es} ${HATS[p.value].emoji}`
        : `wears ${HATS[p.value].name.en} ${HATS[p.value].emoji}`;
    case 'not-hat':
      return lang === 'es'
        ? `no lleva ${HATS[p.value].name.es} ${HATS[p.value].emoji}`
        : `does not wear ${HATS[p.value].name.en} ${HATS[p.value].emoji}`;
    case 'snack':
      return lang === 'es'
        ? `lleva ${SNACKS[p.value].es} ${SNACKS[p.value].emoji}`
        : `has ${SNACKS[p.value].en} ${SNACKS[p.value].emoji}`;
    case 'not-snack':
      return lang === 'es'
        ? `no lleva ${SNACKS[p.value].es} ${SNACKS[p.value].emoji}`
        : `does not have ${SNACKS[p.value].en} ${SNACKS[p.value].emoji}`;
    case 'habitat':
      return p.value === 'water'
        ? (lang === 'es' ? 'es un animal de agua 🌊' : 'is a water animal 🌊')
        : (lang === 'es' ? 'es un animal de tierra 🌿' : 'is a land animal 🌿');
    case 'even':
      return p.value
        ? (lang === 'es' ? 'tiene un número par' : 'has an even number')
        : (lang === 'es' ? 'tiene un número impar' : 'has an odd number');
    case 'gt':
      return lang === 'es' ? `su número es mayor que ${p.threshold}` : `their number is greater than ${p.threshold}`;
    case 'lt':
      return lang === 'es' ? `su número es menor que ${p.threshold}` : `their number is less than ${p.threshold}`;
  }
}

export function caseBriefing(c: CaseFile, lang: Lang): string {
  const clues = joinList(c.clues.map((p) => predicateText(p, lang)), lang);
  return `${c.mystery.prompt[lang]} ${lang === 'es' ? 'Pistas:' : 'Clues:'} ${clues}.`;
}

const ANIMAL_ALIBIS: Record<string, (name: string) => Bi> = {
  octopus: (name) => ({
    es: `🧦 ${name} dice: «¡Imposible! Estaba doblando ocho calcetines a la vez».`,
    en: `🧦 ${name} says: "Impossible! I was folding eight socks at once."`,
  }),
  owl: (name) => ({
    es: `📚 ${name} dice: «¡Yo no fui! Estaba leyendo un libro en mi rama».`,
    en: `📚 ${name} says: "It was not me! I was reading a book on my branch."`,
  }),
  frog: (name) => ({
    es: `🪷 ${name} dice: «¡Inocente! Estaba practicando saltos en el estanque».`,
    en: `🪷 ${name} says: "Innocent! I was practising leaps at the pond."`,
  }),
  penguin: (name) => ({
    es: `🧊 ${name} dice: «¡Qué va! Estaba patinando sobre un cubo de hielo».`,
    en: `🧊 ${name} says: "No way! I was skating on an ice cube."`,
  }),
  bear: (name) => ({
    es: `🍯 ${name} dice: «¡Yo dormía la siesta en mi hamaca!».`,
    en: `🍯 ${name} says: "I was having a snooze in my hammock!"`,
  }),
  turtle: (name) => ({
    es: `🏁 ${name} dice: «¡Imposible! Estaba en una carrera con un caracol».`,
    en: `🏁 ${name} says: "Impossible! I was racing a snail."`,
  }),
  dolphin: (name) => ({
    es: `🫧 ${name} dice: «¡Yo no fui! Estaba haciendo aros de burbujas en el mar».`,
    en: `🫧 ${name} says: "Not me! I was blowing bubble rings in the sea."`,
  }),
  elephant: (name) => ({
    es: `🚿 ${name} dice: «¡Inocente! Estaba regando las flores con mi trompa».`,
    en: `🚿 ${name} says: "Innocent! I was watering the flowers with my trunk."`,
  }),
};

export function wrongAccusationAlibi(suspect: Suspect, rng: Rng): Bi {
  const generic: Bi[] = [
    {
      es: `🙈 ${suspect.name} dice: «¡Yo no fui! Estaba regando mi cactus 🌵».`,
      en: `🙈 ${suspect.name} says: "It wasn't me! I was watering my cactus 🌵."`,
    },
    {
      es: `🧦 ${suspect.name} dice: «¡Soy inocente! Estaba ordenando mis calcetines».`,
      en: `🧦 ${suspect.name} says: "I'm innocent! I was sorting my socks."`,
    },
    {
      es: `🎶 ${suspect.name} dice: «¡Imposible! Estaba cantando en la ducha».`,
      en: `🎶 ${suspect.name} says: "Impossible! I was singing in the shower."`,
    },
    {
      es: `🧩 ${suspect.name} dice: «¡De verdad que no! Estaba haciendo un puzle de mil piezas».`,
      en: `🧩 ${suspect.name} says: "Honestly, not me! I was doing a thousand-piece jigsaw."`,
    },
    {
      es: `🫖 ${suspect.name} dice: «¡Inocente! Estaba tomando una taza de té».`,
      en: `🫖 ${suspect.name} says: "Innocent! I was having a nice cup of tea."`,
    },
    {
      es: `🪁 ${suspect.name} dice: «¡No pude ser yo! Estaba volando una cometa en el parque».`,
      en: `🪁 ${suspect.name} says: "Couldn't be me! I was flying a kite in the park."`,
    },
    {
      es: `🚲 ${suspect.name} dice: «¡Falsa alarma! Estaba hinchando las ruedas de mi bici».`,
      en: `🚲 ${suspect.name} says: "False alarm! I was pumping up my bicycle tyres."`,
    },
    {
      es: `🍿 ${suspect.name} dice: «¡Qué risa! Yo estaba haciendo palomitas».`,
      en: `🍿 ${suspect.name} says: "How funny! I was making popcorn."`,
    },
  ];
  const animalSpecial = ANIMAL_ALIBIS[suspect.animal.name.en];
  if (animalSpecial && rng() < 0.45) {
    return animalSpecial(suspect.name);
  }
  return pick(rng, generic);
}
