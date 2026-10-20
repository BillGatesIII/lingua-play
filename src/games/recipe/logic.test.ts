import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { generateRecipe, recipeMatches, recipeSpeech, recipeTotal } from './logic';

describe('recipe logic', () => {
  it('creates distinct ingredients and quantities at each adaptive level', () => {
    for (const level of [0, 1, 2] as const) {
      const rng = mulberry32(42);
      for (let i = 0; i < 30; i++) {
        const recipe = generateRecipe(rng, level);
        expect(recipe.lines).toHaveLength(level === 2 ? 3 : 2);
        expect(new Set(recipe.lines.map((line) => line.ingredient.id)).size).toBe(recipe.lines.length);
        for (const line of recipe.lines) {
          expect(line.quantity).toBeGreaterThanOrEqual(level === 2 ? 2 : 1);
          expect(line.quantity).toBeLessThanOrEqual([5, 6, 8][level]);
        }
      }
    }
  });

  it('matches the exact ingredient counts and totals them', () => {
    const recipe = generateRecipe(mulberry32(8), 0);
    const basket = Object.fromEntries(recipe.lines.map(({ ingredient, quantity }) => [ingredient.id, quantity]));
    expect(recipeMatches(recipe, basket)).toBe(true);
    expect(recipeTotal(recipe)).toBe(recipe.lines.reduce((sum, line) => sum + line.quantity, 0));
    expect(recipeMatches(recipe, { ...basket, [recipe.lines[0].ingredient.id]: basket[recipe.lines[0].ingredient.id] + 1 })).toBe(false);
  });

  it('builds a recipe instruction in both languages', () => {
    const recipe = generateRecipe(mulberry32(12), 0);
    expect(recipeSpeech(recipe, 'es')).toMatch(/^Añade /);
    expect(recipeSpeech(recipe, 'en')).toMatch(/^Add /);
  });
});
