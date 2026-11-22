import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import {
  CHEFS, DISHES, INGREDIENTS, VERBS, checkRecipe, dishComplimentEs, generateRecipe, quartersBadge,
  quartersText, recipeSpeech,
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

  it('formats fractions and bilingual recipe speeches across all dishes and chefs', () => {
    expect(quartersBadge(0)).toBe('0');
    expect(quartersBadge(1)).toBe('¼');
    expect(quartersBadge(2)).toBe('½');
    expect(quartersBadge(3)).toBe('¾');
    expect(quartersBadge(4)).toBe('1');
    expect(quartersBadge(6)).toBe('1 ½');
    expect(quartersText(2, 'es')).toBe('media taza');
    expect(quartersText(3, 'en')).toBe('three quarters of a cup');

    expect(CHEFS.length).toBeGreaterThanOrEqual(10);
    expect(DISHES.length).toBeGreaterThanOrEqual(12);
    expect(dishComplimentEs(DISHES.find((d) => d.name.es === 'sopa arcoíris')!)).toBe('deliciosa');
    expect(dishComplimentEs(DISHES.find((d) => d.name.es === 'curry volcán')!)).toBe('delicioso');
    expect(dishComplimentEs(DISHES.find((d) => d.name.es === 'tortitas cósmicas')!)).toBe('deliciosas');
    expect(dishComplimentEs(DISHES.find((d) => d.name.es === 'fideos dragón')!)).toBe('deliciosos');

    for (const dish of DISHES) {
      for (const scale of [1, 2] as const) {
        const r = {
          dish,
          ingredients: [INGREDIENTS[0]],
          baseQuarters: 2,
          scale,
          targetQuarters: 2 * scale,
          maxQuarters: 8,
          verb: VERBS[0],
        };
        for (const variant of [-1, 0, 1, 2]) {
          const es = recipeSpeech(r, 'es', variant);
          const en = recipeSpeech(r, 'en', variant);
          expect(es).toContain(dish.name.es);
          expect(en).toContain(dish.name.en);
          if (dish.plural) expect(es).not.toContain('Me apetece ');
        }
      }
    }
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

    // Plural vs singular grammar for extra ingredients across rng variants
    const lemonOnly = { ...r, ingredients: [INGREDIENTS[1]] };
    const seenStrawberry = new Set<string>();
    for (let seed = 0; seed < 15; seed++) {
      const res = checkRecipe(lemonOnly, ['strawberry'], lemonOnly.targetQuarters, lemonOnly.verb.id, mulberry32(seed));
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason.es).not.toContain('fresas no aparece ');
        expect(res.reason.en).not.toContain('strawberries is not');
        seenStrawberry.add(res.reason.en);
      }
    }
    expect(seenStrawberry.size).toBe(2);
    expect([...seenStrawberry].some((line) => line.includes('Strawberries are not'))).toBe(true);
  });
});
