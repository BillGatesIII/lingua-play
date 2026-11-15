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
  { emoji: '🦊', name: { es: 'zorro', en: 'fox' }, habitat: 'land' },
  { emoji: '🦉', name: { es: 'búho', en: 'owl' }, habitat: 'land' },
  { emoji: '🐻', name: { es: 'oso', en: 'bear' }, habitat: 'land' },
  { emoji: '🦁', name: { es: 'león', en: 'lion' }, habitat: 'land' },
  { emoji: '🐰', name: { es: 'conejo', en: 'rabbit' }, habitat: 'land' },
];

export const SUSPECT_NAMES = ['Coco', 'Milo', 'Nora', 'Toby', 'Lula', 'Paco', 'Kiko', 'Vera'] as const;

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

export const MYSTERIES: readonly { emoji: string; prompt: Bi }[] = [
  { emoji: '🍪', prompt: { es: '¿Quién se comió las galletas?', en: 'Who ate the cookies?' } },
  { emoji: '🍍', prompt: { es: '¿Quién escondió la piña dorada?', en: 'Who hid the golden pineapple?' } },
  { emoji: '🔑', prompt: { es: '¿Quién tiene la llave secreta?', en: 'Who has the secret key?' } },
  { emoji: '🎸', prompt: { es: '¿Quién tocó la guitarra de noche?', en: 'Who played the guitar at night?' } },
  { emoji: '👑', prompt: { es: '¿Quién probó la corona real?', en: 'Who tried on the royal crown?' } },
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
export function generateCase(rng: Rng, index: number): CaseFile {
  const count = index < 2 ? 4 : 6;
  const mystery = MYSTERIES[index % MYSTERIES.length];

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

export function wrongAccusationAlibi(suspect: Suspect, rng: Rng): Bi {
  return pick(rng, [
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
  ]);
}
