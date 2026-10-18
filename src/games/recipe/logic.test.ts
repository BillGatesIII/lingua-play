import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { generateRecipe, recipeMatches, recipeSpeech, recipeTotal } from './logic';

describe('recipe logic', () => {
  it('creates distinct ingredients and age-appropriate quantities', () => {
    for (const band of ['7-10', '11-14'] as const) {
      const rng = mulberry32(42);
      for (let i = 0; i < 30; i++) {
        const recipe = generateRecipe(rng, band);
        expect(recipe.lines).toHaveLength(band === '7-10' ? 2 : 3);
        expect(new Set(recipe.lines.map((line) => line.ingredient.id)).size).toBe(recipe.lines.length);
        for (const line of recipe.lines) {
          expect(line.quantity).toBeGreaterThanOrEqual(band === '7-10' ? 1 : 2);
          expect(line.quantity).toBeLessThanOrEqual(band === '7-10' ? 5 : 8);
        }
      }
    }
  });

  it('matches the exact ingredient counts and totals them', () => {
    const recipe = generateRecipe(mulberry32(8), '7-10');
    const basket = Object.fromEntries(recipe.lines.map(({ ingredient, quantity }) => [ingredient.id, quantity]));
    expect(recipeMatches(recipe, basket)).toBe(true);
    expect(recipeTotal(recipe)).toBe(recipe.lines.reduce((sum, line) => sum + line.quantity, 0));
    expect(recipeMatches(recipe, { ...basket, [recipe.lines[0].ingredient.id]: basket[recipe.lines[0].ingredient.id] + 1 })).toBe(false);
  });

  it('builds a recipe instruction in both languages', () => {
    const recipe = generateRecipe(mulberry32(12), '7-10');
    expect(recipeSpeech(recipe, 'es')).toMatch(/^Añade /);
    expect(recipeSpeech(recipe, 'en')).toMatch(/^Add /);
  });
});
