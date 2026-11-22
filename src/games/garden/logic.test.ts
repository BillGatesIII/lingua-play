import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { FLOWERS, FLOWER_NAMES, gardenMistake, generatePattern, isPatternSolved } from './logic';

describe('garden pattern logic', () => {
  it('generates valid addition, countdown, middle-gap, multiplication and alternating patterns', () => {
    const rng = mulberry32(5);
    for (let index = 0; index < 5; index++) {
      for (let i = 0; i < 20; i++) {
        const puzzle = generatePattern(rng, index);
        expect(puzzle.slots[puzzle.missingIndex]).toBeNull();
        expect(puzzle.fullSequence[puzzle.missingIndex]).toBe(puzzle.answer);
        expect(puzzle.choices).toContain(puzzle.answer);
        expect(new Set(puzzle.choices).size).toBe(4);
      }
    }
  });

  it('recognizes the missing number and provides playful mistakes', () => {
    const puzzle = generatePattern(mulberry32(18), 2);
    expect(puzzle.missingIndex).toBeGreaterThanOrEqual(1);
    expect(puzzle.missingIndex).toBeLessThanOrEqual(2);
    expect(isPatternSolved(puzzle, puzzle.answer)).toBe(true);
    expect(isPatternSolved(puzzle, puzzle.answer + 1)).toBe(false);
    const oops = gardenMistake(mulberry32(3));
    expect(oops.text.es.length).toBeGreaterThan(5);
    expect(oops.badge.length).toBeGreaterThan(0);
    expect(FLOWERS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(FLOWERS).size).toBe(FLOWERS.length);
    for (const f of FLOWERS) expect(FLOWER_NAMES[f]).toBeTruthy();
  });
});
