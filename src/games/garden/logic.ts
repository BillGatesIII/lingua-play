import type { Bi } from '../../shared/i18n';
import { numberWord } from '../../shared/i18n';
import { randInt, shuffle, type Rng } from '../../shared/rng';
import type { ChallengeLevel } from '../../shared/adaptive';

export interface PatternPuzzle {
  sequence: number[];
  answer: number;
  choices: number[];
  instruction: Bi;
}

export const GARDEN_LENGTH = 5;

function options(rng: Rng, answer: number, spread: number): number[] {
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const candidate = answer + randInt(rng, -spread, spread);
    if (candidate > 0 && candidate !== answer) distractors.add(candidate);
  }
  return shuffle(rng, [answer, ...distractors]);
}

export function generatePattern(rng: Rng, level: ChallengeLevel, index: number): PatternPuzzle {
  if (level === 0) {
    const start = randInt(rng, 1, 10);
    const step = randInt(rng, 2, 5);
    const sequence = [start, start + step, start + step * 2];
    return {
      sequence,
      answer: start + step * 3,
      choices: options(rng, start + step * 3, 5),
      instruction: {
        es: `Cada maceta tiene ${numberWord(step, 'es')} flores más que la anterior.`,
        en: `Each flower bed has ${numberWord(step, 'en')} more flowers than the last.`,
      },
    };
  }

  if (level === 1 && index % 2 === 0) {
    const start = randInt(rng, 2, 9);
    const factor = randInt(rng, 2, 3);
    const sequence = [start, start * factor, start * factor ** 2];
    const answer = start * factor ** 3;
    return {
      sequence,
      answer,
      choices: options(rng, answer, Math.max(5, start * factor)),
      instruction: {
        es: `Cada maceta tiene ${factor === 2 ? 'el doble' : 'el triple'} de flores que la anterior.`,
        en: `Each flower bed has ${factor === 2 ? 'twice' : 'three times'} as many flowers as the last.`,
      },
    };
  }

  const firstStep = level === 2 ? 3 : 2;
  const secondStep = level === 2 ? 6 : 4;
  const start = randInt(rng, level === 2 ? 5 : 2, level === 2 ? 15 : 12);
  const sequence = [start, start + firstStep, start + firstStep + secondStep, start + 2 * firstStep + secondStep];
  const answer = sequence[3] + secondStep;
  return {
    sequence,
    answer,
    choices: options(rng, answer, level === 2 ? 12 : 8),
    instruction: {
      es: `Las macetas alternan: añade ${numberWord(firstStep, 'es')} flores y luego ${numberWord(secondStep, 'es')}.`,
      en: `The flower beds alternate: add ${numberWord(firstStep, 'en')} flowers, then ${numberWord(secondStep, 'en')}.`,
    },
  };
}

export function isPatternSolved(puzzle: PatternPuzzle, choice: number): boolean {
  return choice === puzzle.answer;
}

export function sequenceTotal(puzzle: PatternPuzzle): number {
  return puzzle.sequence.reduce((sum, value) => sum + value, 0);
}

export function patternNumberWords(puzzle: PatternPuzzle, lang: 'es' | 'en'): string {
  return puzzle.sequence.map((n) => numberWord(n, lang)).join(', ');
}
