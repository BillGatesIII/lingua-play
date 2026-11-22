import type { Bi } from '../../shared/i18n';
import { numberWord } from '../../shared/i18n';
import { pick, randInt, shuffle, type Rng } from '../../shared/rng';

export interface PatternPuzzle {
  /** Sequence with `null` at `missingIndex`. */
  slots: (number | null)[];
  fullSequence: number[];
  missingIndex: number;
  answer: number;
  choices: number[];
  instruction: Bi;
}

export const GARDEN_LENGTH = 5;
export const FLOWERS = ['🌷', '🌻', '🌼', '🌺', '🌸', '🌹', '🪷', '🪻', '🍀', '💐'] as const;
export const FLOWER_NAMES: Record<(typeof FLOWERS)[number], string> = {
  '🌷': 'tulip',
  '🌻': 'sunflower',
  '🌼': 'daisy',
  '🌺': 'hibiscus',
  '🌸': 'cherry blossom',
  '🌹': 'rose',
  '🪷': 'lotus',
  '🪻': 'hyacinth',
  '🍀': 'clover',
  '💐': 'bouquet',
};

function options(rng: Rng, answer: number, spread: number): number[] {
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const candidate = answer + randInt(rng, -spread, spread);
    if (candidate > 0 && candidate !== answer) distractors.add(candidate);
  }
  return shuffle(rng, [answer, ...distractors]);
}

/** Generates a garden pattern puzzle progressing across 5 stages for ages 8-12. */
export function generatePattern(rng: Rng, index: number): PatternPuzzle {
  if (index === 0) {
    const start = randInt(rng, 2, 10);
    const step = randInt(rng, 2, 5);
    const full = [start, start + step, start + step * 2, start + step * 3];
    const missingIndex = 3;
    const answer = full[missingIndex];
    return {
      slots: [full[0], full[1], full[2], null],
      fullSequence: full,
      missingIndex,
      answer,
      choices: options(rng, answer, 5),
      instruction: pick(rng, [
        {
          es: `Cada maceta tiene ${numberWord(step, 'es')} flores más que la anterior.`,
          en: `Each flower bed has ${numberWord(step, 'en')} more flowers than the last.`,
        },
        {
          es: `¡A crecer! Cada maceta suma ${numberWord(step, 'es')} flores más.`,
          en: `Growing time! Each flower pot adds ${numberWord(step, 'en')} more flowers.`,
        },
      ]),
    };
  }

  if (index === 1) {
    const step = randInt(rng, 2, 5);
    const start = randInt(rng, step * 4 + 2, step * 4 + 12);
    const full = [start, start - step, start - step * 2, start - step * 3];
    const missingIndex = 3;
    const answer = full[missingIndex];
    return {
      slots: [full[0], full[1], full[2], null],
      fullSequence: full,
      missingIndex,
      answer,
      choices: options(rng, answer, 5),
      instruction: pick(rng, [
        {
          es: `¡Hora de cosechar! Cada maceta tiene ${numberWord(step, 'es')} flores menos que la anterior.`,
          en: `Harvest time! Each flower bed has ${numberWord(step, 'en')} fewer flowers than the last.`,
        },
        {
          es: `Las abejas recogen pétalos: las macetas bajan de ${numberWord(step, 'es')} en ${numberWord(step, 'es')}.`,
          en: `The bees are gathering petals: each pot goes down by ${numberWord(step, 'en')}.`,
        },
      ]),
    };
  }

  if (index === 2) {
    const start = randInt(rng, 3, 12);
    const step = randInt(rng, 3, 6);
    const full = [start, start + step, start + step * 2, start + step * 3];
    const missingIndex = randInt(rng, 1, 2);
    const answer = full[missingIndex];
    return {
      slots: full.map((v, i) => (i === missingIndex ? null : v)),
      fullSequence: full,
      missingIndex,
      answer,
      choices: options(rng, answer, 6),
      instruction: {
        es: `Falta una maceta en medio: cada paso suma ${numberWord(step, 'es')} flores.`,
        en: `A pot is missing in the middle: each step adds ${numberWord(step, 'en')} flowers.`,
      },
    };
  }

  if (index === 3) {
    const start = randInt(rng, 2, 7);
    const factor = randInt(rng, 2, 3);
    const full = [start, start * factor, start * factor ** 2, start * factor ** 3];
    const missingIndex = 3;
    const answer = full[missingIndex];
    return {
      slots: [full[0], full[1], full[2], null],
      fullSequence: full,
      missingIndex,
      answer,
      choices: options(rng, answer, Math.max(5, start * factor)),
      instruction: {
        es: `¡Semillas mágicas! Cada maceta tiene ${factor === 2 ? 'el doble' : 'el triple'} de flores que la anterior.`,
        en: `Magic seeds! Each flower bed has ${factor === 2 ? 'twice' : 'three times'} as many flowers as the last.`,
      },
    };
  }

  const start = randInt(rng, 2, 10);
  const full = [start, start + 2, start + 6, start + 8, start + 12];
  const missingIndex = 4;
  const answer = full[missingIndex];
  return {
    slots: [full[0], full[1], full[2], full[3], null],
    fullSequence: full,
    missingIndex,
    answer,
    choices: options(rng, answer, 8),
    instruction: {
      es: 'Las macetas alternan: primero suma dos flores y luego cuatro.',
      en: 'The flower beds alternate: first add two flowers, then four.',
    },
  };
}

export function isPatternSolved(puzzle: PatternPuzzle, choice: number): boolean {
  return choice === puzzle.answer;
}

export function gardenMistake(rng: Rng): { badge: string; text: Bi } {
  return pick(rng, [
    { badge: '🐛', text: { es: '🐛 ¡Ups! De esa semilla salió una oruga haciendo cosquillas.', en: '🐛 Oops! A ticklish caterpillar popped out of that seed packet.' } },
    { badge: '🍄', text: { es: '🍄 ¡Brotó una seta saltarina! Mira los números de al lado y prueba otra semilla.', en: '🍄 A bouncy mushroom sprouted! Check the neighbouring pots and try another.' } },
    { badge: '🐸', text: { es: '🐸 ¡Un sapo se sentó en esa maceta! Prueba con otro paquete.', en: '🐸 A frog hopped onto that pot! Try another seed packet.' } },
    { badge: '🦔', text: { es: '🦔 ¡Un erizo curioso salió a saludar! Prueba otra semilla.', en: '🦔 A curious hedgehog popped up to say hello! Try another seed.' } },
    { badge: '🐞', text: { es: '🐞 ¡Una mariquita aterrizó aquí! Cuenta el salto entre las macetas.', en: '🐞 A ladybird landed here! Count the jump between the pots.' } },
    { badge: '🐌', text: { es: '🐌 ¡Un caracol dormilón se mudó a esta maceta! Intenta con otro número.', en: '🐌 A sleepy snail moved into this pot! Try another number.' } },
    { badge: '🦋', text: { es: '🦋 ¡Una mariposa despistada revolotea por aquí! Prueba otro paquete.', en: '🦋 A cheeky butterfly fluttered out! Try another seed packet.' } },
    { badge: '🐇', text: { es: '🐇 ¡Un conejo buscaba zanahorias en esa maceta! Prueba otra semilla.', en: '🐇 A rabbit was hunting for carrots in that pot! Try another.' } },
    { badge: '🦗', text: { es: '🦗 ¡Cri-cri! Un grillo dio un concierto en vez de flores.', en: '🦗 Chirp-chirp! A cricket played a concert instead of flowers.' } },
    { badge: '🐦', text: { es: '🐦 ¡Un pajarito picoteó esa semilla! Elige otro paquete.', en: '🐦 A little bird nibbled that seed! Pick another packet.' } },
  ]);
}
