import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { generatePattern, isPatternSolved, sequenceTotal } from './logic';

describe('garden pattern logic', () => {
  it('generates valid addition patterns for ages 7–10', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 40; i++) {
      const puzzle = generatePattern(rng, '7-10', i);
      expect(puzzle.sequence).toHaveLength(3);
      expect(puzzle.sequence[1] - puzzle.sequence[0]).toBe(puzzle.sequence[2] - puzzle.sequence[1]);
      expect(puzzle.answer - puzzle.sequence[2]).toBe(puzzle.sequence[1] - puzzle.sequence[0]);
      expect(puzzle.choices).toContain(puzzle.answer);
      expect(new Set(puzzle.choices).size).toBe(4);
    }
  });

  it('generates multiplication and alternating patterns for older players', () => {
    const multiply = generatePattern(mulberry32(2), '11-14', 0);
    expect(multiply.sequence[1] / multiply.sequence[0]).toBe(multiply.sequence[2] / multiply.sequence[1]);
    expect(multiply.choices).toContain(multiply.answer);
    const alternating = generatePattern(mulberry32(2), '11-14', 1);
    expect(alternating.sequence).toHaveLength(4);
    expect(alternating.sequence[1] - alternating.sequence[0]).toBe(2);
    expect(alternating.sequence[2] - alternating.sequence[1]).toBe(4);
    expect(alternating.answer).toBe(alternating.sequence[3] + 4);
  });

  it('recognizes the missing number and sums visible flower beds', () => {
    const puzzle = generatePattern(mulberry32(18), '7-10', 0);
    expect(isPatternSolved(puzzle, puzzle.answer)).toBe(true);
    expect(isPatternSolved(puzzle, puzzle.answer + 1)).toBe(false);
    expect(sequenceTotal(puzzle)).toBe(puzzle.sequence.reduce((sum, n) => sum + n, 0));
  });
});
