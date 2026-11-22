import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import {
  ANIMALS, MYSTERIES, caseBriefing, generateCase, matchesPredicate, predicateText, wrongAccusationAlibi,
  type Suspect,
} from './logic';

describe('detective logic', () => {
  it('always generates cases with a single unique culprit matching all clues', () => {
    const rng = mulberry32(77);
    for (let i = 0; i < 5; i++) {
      for (let n = 0; n < 40; n++) {
        const c = generateCase(rng, i);
        expect(c.suspects.length).toBe(i < 2 ? 4 : 6);
        const matches = c.suspects.filter((s) => c.clues.every((p) => matchesPredicate(s, p)));
        expect(matches).toHaveLength(1);
        expect(matches[0].id).toBe(c.culpritId);
      }
    }
  });

  it('formats all clue predicates cleanly in both languages', () => {
    const c = generateCase(mulberry32(13), 4);
    for (const p of c.clues) {
      expect(predicateText(p, 'es').length).toBeGreaterThan(5);
      expect(predicateText(p, 'en').length).toBeGreaterThan(5);
    }
    const alibi = wrongAccusationAlibi(c.suspects[0], mulberry32(3));
    expect(alibi.es).toContain(c.suspects[0].name);
    expect(alibi.en).toContain(c.suspects[0].name);
    expect(MYSTERIES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(MYSTERIES.map((m) => m.emoji)).size).toBe(MYSTERIES.length);
    expect(new Set(MYSTERIES.map((m) => m.name)).size).toBe(MYSTERIES.length);
    expect(ANIMALS.length).toBeGreaterThanOrEqual(14);
    expect(caseBriefing(c, 'es')).toContain(c.mystery.prompt.es);
    expect(caseBriefing(c, 'en')).toContain(c.mystery.prompt.en);
  });

  it('produces animal-specific and generic wrong-accusation alibis', () => {
    const base: Suspect = {
      id: 's-0',
      name: 'Alma',
      animal: ANIMALS.find((a) => a.name.en === 'dolphin')!,
      hat: 'none',
      glasses: false,
      snack: 'apple',
      badge: 2,
    };
    const seenEs = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const alibi = wrongAccusationAlibi(base, mulberry32(seed));
      expect(alibi.es).toContain('Alma');
      expect(alibi.en).toContain('Alma');
      seenEs.add(alibi.es);
    }
    expect([...seenEs].some((s) => s.includes('burbujas'))).toBe(true);
    expect(seenEs.size).toBeGreaterThan(3);
  });
});
