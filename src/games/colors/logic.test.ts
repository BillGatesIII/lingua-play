import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import {
  ALL_TARGETS, COLORS, MAX_POTS, POTS, ROUND_LENGTH, clueText, generateRound, mix, mixFeedback, playfulClue,
  recipePotCount, recipePots, togglePot,
} from './logic';

describe('colors logic', () => {
  it('mixes primaries, white and black in any order', () => {
    expect(mix([])).toBeNull();
    expect(mix(['red'])).toBe('red');
    expect(mix(['red', 'yellow'])).toBe('orange');
    expect(mix(['yellow', 'red'])).toBe('orange');
    expect(mix(['yellow', 'blue'])).toBe('green');
    expect(mix(['blue', 'red'])).toBe('purple');
    expect(mix(['red', 'red'])).toBe('red');
    expect(mix(['red', 'white'])).toBe('pink');
    expect(mix(['white', 'blue'])).toBe('lightblue');
    expect(mix(['yellow', 'white'])).toBe('cream');
    expect(mix(['black', 'white'])).toBe('grey');
    expect(mix(['blue', 'yellow', 'red'])).toBe('brown');
    expect(mix(['blue', 'yellow', 'black'])).toBe('darkgreen');
    expect(mix(['red', 'white', 'black'])).toBe('mud');
  });

  it('toggles pots and keeps the bowl within its limit', () => {
    expect(togglePot([], 'red', 2)).toEqual(['red']);
    expect(togglePot(['red'], 'red', 2)).toEqual([]);
    expect(togglePot(['red', 'blue'], 'yellow', 2)).toEqual(['blue', 'yellow']);
    expect(togglePot(['red', 'blue'], 'yellow', 3)).toEqual(['red', 'blue', 'yellow']);
  });

  it('every target can be mixed from the shelf pots within MAX_POTS', () => {
    const reachable = new Set<string>();
    const walk = (bowl: typeof POTS[number][], from: number) => {
      const c = mix(bowl);
      if (c) reachable.add(c);
      if (bowl.length === MAX_POTS) return;
      for (let i = from; i < POTS.length; i++) walk([...bowl, POTS[i]], i + 1);
    };
    walk([], 0);
    for (const t of ALL_TARGETS) expect(reachable.has(t)).toBe(true);
  });

  it('generates varied rounds of 5 distinct colours', () => {
    const rng = mulberry32(7);
    const seen = new Set<string>();
    for (let n = 0; n < 30; n++) {
      const round = generateRound(rng);
      expect(round).toHaveLength(ROUND_LENGTH);
      expect(new Set(round).size).toBe(ROUND_LENGTH);
      for (const c of round) expect(ALL_TARGETS).toContain(c);
      seen.add(round.join());
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  it('names colours in both languages and supports playful simile clues', () => {
    expect(clueText('green', 'es')).toBe('Pinta el camaleón de verde.');
    expect(clueText('lightblue', 'en')).toBe('Paint the chameleon light blue.');
    expect(playfulClue('green', 1, 'en')).toContain('frog');
    expect(playfulClue('green', 1, 'en', 1)).not.toBe(playfulClue('green', 1, 'en', 0));
    expect(playfulClue('green', 0, 'en', 0, true)).toContain('frog');
    expect(playfulClue('green', -1, 'en', -1)).toContain('cactus');
    expect(mixFeedback('mud', mulberry32(2)).es.length).toBeGreaterThan(5);
    expect(mixFeedback('purple', mulberry32(4)).en).toContain('purple');
    expect(COLORS.orange.name).toEqual({ es: 'naranja', en: 'orange' });
    expect(recipePotCount('red')).toBe(1);
    expect(recipePotCount('purple')).toBe(2);
    expect(recipePotCount('lavender')).toBe(3);
    expect(recipePots('lavender')).toEqual(['blue', 'red', 'white']);
    expect(recipePots('mud')).toEqual([]);
  });
});
