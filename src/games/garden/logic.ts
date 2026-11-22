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
export const FLOWERS = ['🌷', '🌻', '🌼', '🌺', '🌸'] as const;
export const FLOWER_NAMES: Record<(typeof FLOWERS)[number], string> = {
  '🌷': 'tulip',
  '🌻': 'sunflower',
  '🌼': 'daisy',
  '🌺': 'hibiscus',
  '🌸': 'cherry blossom',
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
      instruction: {
        es: `Cada maceta tiene ${numberWord(step, 'es')} flores más que la anterior.`,
        en: `Each flower bed has ${numberWord(step, 'en')} more flowers than the last.`,
      },
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
      instruction: {
        es: `¡Hora de cosechar! Cada maceta tiene ${numberWord(step, 'es')} flores menos que la anterior.`,
        en: `Harvest time! Each flower bed has ${numberWord(step, 'en')} fewer flowers than the last.`,
      },
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
    { badge: '🍄', text: { es: '🍄 ¡Brotó una seta saltarina! Mira los números de al lado y prueba otra.', en: '🍄 A bouncy mushroom sprouted! Check the neighbouring pots and try another.' } },
    { badge: '🐸', text: { es: '🐸 ¡Un sapo se sentó en esa maceta! Prueba con otro paquete.', en: '🐸 A frog hopped onto that pot! Try another seed packet.' } },
  ]);
}
