import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import {
  VERBS, checkRecipe, generateRecipe, quartersBadge, quartersText, recipeSpeech,
} from './logic';

describe('recipe logic', () => {
  it('generates valid recipes that scale up across the 5 dishes', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 5; i++) {
      for (let n = 0; n < 30; n++) {
        const r = generateRecipe(rng, i);
        expect(r.targetQuarters).toBe(r.baseQuarters * r.scale);
        expect(r.targetQuarters).toBeGreaterThan(0);
        expect(r.targetQuarters).toBeLessThanOrEqual(r.maxQuarters);
        expect(r.ingredients.length).toBe(i < 2 ? 1 : 2);
      }
    }
  });

  it('formats fractions and bilingual recipe speeches', () => {
    expect(quartersBadge(0)).toBe('0');
    expect(quartersBadge(1)).toBe('¼');
    expect(quartersBadge(2)).toBe('½');
    expect(quartersBadge(3)).toBe('¾');
    expect(quartersBadge(4)).toBe('1');
    expect(quartersBadge(6)).toBe('1 ½');
    expect(quartersText(2, 'es')).toBe('media taza');
    expect(quartersText(3, 'en')).toBe('three quarters of a cup');

    const r = generateRecipe(mulberry32(12), 3);
    expect(recipeSpeech(r, 'es').length).toBeGreaterThan(10);
    expect(recipeSpeech(r, 'en').length).toBeGreaterThan(10);
  });

  it('validates ingredients, fraction amount, and final action verb', () => {
    const r = generateRecipe(mulberry32(5), 0);
    const ids = r.ingredients.map((i) => i.id);
    const wrongVerb = VERBS.find((v) => v.id !== r.verb.id)!.id;

    expect(checkRecipe(r, [], r.targetQuarters, r.verb.id).ok).toBe(false);
    expect(checkRecipe(r, ids, r.targetQuarters - 1, r.verb.id).ok).toBe(false);
    expect(checkRecipe(r, ids, r.targetQuarters + 1, r.verb.id).ok).toBe(false);
    expect(checkRecipe(r, ids, r.targetQuarters, wrongVerb).ok).toBe(false);
    expect(checkRecipe(r, ids, r.targetQuarters, r.verb.id)).toEqual({ ok: true });
  });
});
