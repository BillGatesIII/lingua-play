import type { Bi, Lang } from '../../shared/i18n';
import { pick, shuffle, type Rng } from '../../shared/rng';

export interface Word {
  emoji: string;
  answer: Bi;
  clue: Bi;
}

export const WORDS: readonly Word[] = [
  { emoji: '🏠', answer: { es: 'casa', en: 'house' }, clue: { es: 'Un lugar donde vive una familia.', en: 'A place where a family lives.' } },
  { emoji: '🐈', answer: { es: 'gato', en: 'cat' }, clue: { es: 'Un animal que ronronea.', en: 'An animal that purrs.' } },
  { emoji: '🌙', answer: { es: 'luna', en: 'moon' }, clue: { es: 'Brilla en el cielo por la noche.', en: 'It shines in the night sky.' } },
  { emoji: '☁️', answer: { es: 'nube', en: 'cloud' }, clue: { es: 'Flota blanca en el cielo y trae lluvia.', en: 'It floats white in the sky and brings rain.' } },
  { emoji: '📚', answer: { es: 'libro', en: 'book' }, clue: { es: 'Tiene páginas llenas de historias.', en: 'It has pages full of stories.' } },
  { emoji: '🏖️', answer: { es: 'playa', en: 'beach' }, clue: { es: 'Tiene arena y olas.', en: 'It has sand and waves.' } },
  { emoji: '🧀', answer: { es: 'queso', en: 'cheese' }, clue: { es: 'Comida amarilla hecha de leche.', en: 'A yellow food made from milk.' } },
  { emoji: '🔥', answer: { es: 'fuego', en: 'fire' }, clue: { es: 'Da calor y luz en una hoguera.', en: 'It gives warmth and light in a campfire.' } },
  { emoji: '🏴‍☠️', answer: { es: 'pirata', en: 'pirate' }, clue: { es: 'Navega en barco buscando tesoros.', en: 'Sails on a ship looking for treasure.' } },
  { emoji: '⭐', answer: { es: 'estrella', en: 'star' }, clue: { es: 'Un punto brillante que vemos en el cielo.', en: 'A bright spot we can see in the sky.' } },
  { emoji: '🐢', answer: { es: 'tortuga', en: 'turtle' }, clue: { es: 'Un animal lento que lleva su casa a la espalda.', en: 'A slow animal that carries its home on its back.' } },
  { emoji: '🦋', answer: { es: 'mariposa', en: 'butterfly' }, clue: { es: 'Un insecto de alas coloridas.', en: 'An insect with colourful wings.' } },
];

export interface LetterTile {
  id: number;
  letter: string;
}

export interface WordPuzzle extends Word {
  tiles: LetterTile[];
}

export const WORD_ROUND_LENGTH = 5;

const wordLength = (word: Word, lang: Lang): number => word.answer[lang].length;

/** Generates a word puzzle progressing from shorter (4-5) to longer (6-9) words for ages 8-12. */
export function generateWordPuzzle(
  rng: Rng,
  index: number,
  lang: Lang,
  exclude: readonly string[] = [],
): WordPuzzle {
  const candidates = WORDS.filter((w) => !exclude.includes(w.emoji));
  const poolBase = candidates.length ? candidates : WORDS;
  const filtered = poolBase.filter((word) => {
    const length = wordLength(word, lang);
    if (index < 2) return length <= 5;
    if (index < 4) return length >= 5 && length <= 7;
    return length >= 6;
  });
  const word = pick(rng, filtered.length ? filtered : poolBase);
  const answer = word.answer[lang];
  const extraCount = index < 2 ? 2 : index < 4 ? 3 : 4;
  const distractors = Array.from({ length: extraCount }, () =>
    pick(rng, [...'abcdefgilmnoprstuv']));
  const letters = shuffle(rng, [...answer, ...distractors]);
  return { ...word, tiles: letters.map((letter, id) => ({ id, letter })) };
}

export function selectedWord(puzzle: WordPuzzle, selectedIds: readonly number[]): string {
  return selectedIds.map((id) => puzzle.tiles.find((tile) => tile.id === id)?.letter ?? '').join('');
}

export function isWordSolved(puzzle: WordPuzzle, selectedIds: readonly number[], lang: Lang): boolean {
  return selectedWord(puzzle, selectedIds).toLowerCase() === puzzle.answer[lang].toLowerCase();
}

export function wordClue(puzzle: WordPuzzle, lang: Lang): string {
  return puzzle.clue[lang];
}

export function wordLetterCount(puzzle: WordPuzzle, lang: Lang): number {
  return puzzle.answer[lang].length;
}

export function wordMistake(attempt: string, rng: Rng): Bi {
  const shown = attempt.toUpperCase();
  return pick(rng, [
    { es: `🦉 ¿«${shown}»? ¡Eso suena a estornudo de dragón! 🐉`, en: `🦉 "${shown}"? That sounds like a dragon sneezing! 🐉` },
    { es: `🪶 ¡Casi! «${shown}» parece una palabra inventada por un pato. 🦆`, en: `🪶 Almost! "${shown}" sounds like a word made up by a duck. 🦆` },
  ]);
}
