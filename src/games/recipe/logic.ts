import type { Bi, Lang } from '../../shared/i18n';
import { joinList, numberWord } from '../../shared/i18n';
import { pick, randInt, shuffle, type Rng } from '../../shared/rng';
import type { AgeBand } from '../../shared/storage';

export interface Ingredient {
  id: string;
  emoji: string;
  gender: 'm' | 'f';
  name: Bi;
  plural: Bi;
}

export const INGREDIENTS: readonly Ingredient[] = [
  { id: 'apple', emoji: '🍎', gender: 'f', name: { es: 'manzana', en: 'apple' }, plural: { es: 'manzanas', en: 'apples' } },
  { id: 'pear', emoji: '🍐', gender: 'f', name: { es: 'pera', en: 'pear' }, plural: { es: 'peras', en: 'pears' } },
  { id: 'cheese', emoji: '🧀', gender: 'm', name: { es: 'queso', en: 'cheese' }, plural: { es: 'quesos', en: 'cheeses' } },
  { id: 'bread', emoji: '🍞', gender: 'm', name: { es: 'pan', en: 'bread' }, plural: { es: 'panes', en: 'loaves of bread' } },
  { id: 'tomato', emoji: '🍅', gender: 'm', name: { es: 'tomate', en: 'tomato' }, plural: { es: 'tomates', en: 'tomatoes' } },
  { id: 'carrot', emoji: '🥕', gender: 'f', name: { es: 'zanahoria', en: 'carrot' }, plural: { es: 'zanahorias', en: 'carrots' } },
];

export interface Recipe {
  lines: { ingredient: Ingredient; quantity: number }[];
}

export const RECIPE_LENGTH = 4;

export function generateRecipe(rng: Rng, band: AgeBand): Recipe {
  const ingredients = shuffle(rng, [...INGREDIENTS]).slice(0, band === '7-10' ? 2 : 3);
  return {
    lines: ingredients.map((ingredient) => ({
      ingredient,
      quantity: randInt(rng, band === '7-10' ? 1 : 2, band === '7-10' ? 5 : 8),
    })),
  };
}

export function recipeSpeech(recipe: Recipe, lang: Lang): string {
  const items = recipe.lines.map(({ ingredient, quantity }) =>
    `${numberWord(quantity, lang, ingredient.gender)} ${quantity === 1 ? ingredient.name[lang] : ingredient.plural[lang]}`);
  return lang === 'es'
    ? `Añade ${joinList(items, lang)} al cuenco.`
    : `Add ${joinList(items, lang)} to the bowl.`;
}

export function recipeMatches(recipe: Recipe, basket: Readonly<Record<string, number>>): boolean {
  return INGREDIENTS.every((ingredient) =>
    (basket[ingredient.id] ?? 0) === (recipe.lines.find((line) => line.ingredient.id === ingredient.id)?.quantity ?? 0));
}

export function recipeTotal(recipe: Recipe): number {
  return recipe.lines.reduce((total, line) => total + line.quantity, 0);
}
