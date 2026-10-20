import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import {
  COLORS, ROUND_LENGTH, clueText, generateRound, maxPots, mix, potsForLevel, targetsForLevel, togglePot,
} from './logic';

describe('colors logic', () => {
  it('mixes primaries into secondary colours, in any order', () => {
    expect(mix([])).toBeNull();
    expect(mix(['red'])).toBe('red');
    expect(mix(['red', 'yellow'])).toBe('orange');
    expect(mix(['yellow', 'red'])).toBe('orange');
    expect(mix(['yellow', 'blue'])).toBe('green');
    expect(mix(['blue', 'red'])).toBe('purple');
    expect(mix(['red', 'red'])).toBe('red');
    expect(mix(['red', 'white'])).toBe('pink');
    expect(mix(['white', 'blue'])).toBe('lightblue');
    expect(mix(['blue', 'yellow', 'red'])).toBe('brown');
    expect(mix(['yellow', 'white'])).toBe('grey');
  });

  it('toggles pots and keeps the bowl within its limit', () => {
    expect(togglePot([], 'red', 2)).toEqual(['red']);
    expect(togglePot(['red'], 'red', 2)).toEqual([]);
    expect(togglePot(['red', 'blue'], 'yellow', 2)).toEqual(['blue', 'yellow']);
    expect(togglePot(['red', 'blue'], 'yellow', 3)).toEqual(['red', 'blue', 'yellow']);
  });

  it('every target can be mixed from the adaptive pots within the bowl limit', () => {
    for (const level of [0, 1, 2] as const) {
      const pots = potsForLevel(level);
      const reachable = new Set<string>();
      const walk = (bowl: typeof pots, from: number) => {
        const c = mix(bowl);
        if (c) reachable.add(c);
        if (bowl.length === maxPots(level)) return;
        for (let i = from; i < pots.length; i++) walk([...bowl, pots[i]], i + 1);
      };
      walk([], 0);
      for (const t of targetsForLevel(level)) expect(reachable.has(t)).toBe(true);
    }
  });

  it('generates varied rounds of different colours', () => {
    const rng = mulberry32(7);
    const seen = new Set<string>();
    for (const level of [0, 1, 2] as const) {
      for (let n = 0; n < 30; n++) {
        const round = generateRound(rng, level);
        expect(round).toHaveLength(ROUND_LENGTH);
        expect(new Set(round).size).toBe(ROUND_LENGTH);
        for (const c of round) expect(targetsForLevel(level)).toContain(c);
        seen.add(round.join());
      }
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  it('names colours in both languages', () => {
    expect(clueText('green', 'es')).toBe('Pinta el camaleón de verde.');
    expect(clueText('lightblue', 'en')).toBe('Paint the chameleon light blue.');
    expect(COLORS.orange.name).toEqual({ es: 'naranja', en: 'orange' });
  });
});
