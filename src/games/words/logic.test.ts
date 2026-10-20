import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { generateWordPuzzle, isWordSolved, selectedWord, wordLetterCount } from './logic';

describe('word puzzle logic', () => {
  it('creates usable letter tiles at every adaptive level and language', () => {
    for (const level of [0, 1, 2] as const) {
      for (const lang of ['es', 'en'] as const) {
        const puzzle = generateWordPuzzle(mulberry32(15), level, lang);
        expect(puzzle.tiles.length).toBeGreaterThan(wordLetterCount(puzzle, lang));
        expect(puzzle.tiles.map((tile) => tile.id)).toEqual(puzzle.tiles.map((_, i) => i));
      }
    }
  });

  it('assembles and recognizes the answer from selected tile ids', () => {
    const puzzle = generateWordPuzzle(mulberry32(21), 0, 'es');
    const answer = puzzle.answer.es;
    const correctIds = [...answer].reduce<number[]>((selected, letter) => {
      const tile = puzzle.tiles.find((candidate) => candidate.letter === letter && !selected.includes(candidate.id));
      if (tile) selected.push(tile.id);
      return selected;
    }, []);
    expect(selectedWord(puzzle, correctIds)).toBe(answer);
    expect(isWordSolved(puzzle, correctIds, 'es')).toBe(true);
    expect(isWordSolved(puzzle, correctIds.slice(1), 'es')).toBe(false);
  });
});
