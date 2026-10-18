import { other, tr, type Bi } from '../../shared/i18n';
import { mulberry32 } from '../../shared/rng';
import type { Page } from '../../pages/types';
import { Button, Card, Panel, biText } from '../../ui/components';
import { h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { INGREDIENTS, RECIPE_LENGTH, generateRecipe, recipeMatches, recipeSpeech, recipeTotal, type Recipe } from './logic';

export const recipePage: Page = (ctx) => {
  let { lang, band } = ctx;
  const rng = mulberry32((Date.now() ^ 0x7f4a7c15) >>> 0);
  let index = 0;
  let recipe: Recipe = generateRecipe(rng, band);
  let bowl: Record<string, number> = {};
  let solved = false;
  let closed = false;
  let translate = false;
  let message: Bi | null = null;
  const dishes: string[] = [];
  const host = h('div', { class: 'world world--recipe' });
  ctx.root.append(host);

  function add(ingredientId: string, delta: number) {
    const next = Math.max(0, (bowl[ingredientId] ?? 0) + delta);
    bowl = { ...bowl, [ingredientId]: next };
    message = null;
    draw();
  }

  function stir() {
    if (recipeMatches(recipe, bowl)) {
      solved = true;
      dishes.push(recipe.lines.map((line) => line.ingredient.emoji).join(' '));
      message = { es: '¡La receta está perfecta! 🍽️', en: 'The recipe is just right! 🍽️' };
    } else {
      message = { es: '¡Prueba otra vez! Puedes añadir o quitar ingredientes.', en: 'Try again! You can add or remove ingredients.' };
    }
    draw(solved ? 'next-recipe' : undefined);
  }

  function next() {
    index++;
    if (index >= RECIPE_LENGTH) closed = true;
    else {
      recipe = generateRecipe(rng, band);
      bowl = {};
      solved = false;
    }
    message = null;
    draw(closed ? 'play-again' : `ingredient-${INGREDIENTS[0].id}`);
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(h('header', { class: 'game__head' },
        h('div', {}, h('h1', { class: 'game__title' }, '🥣 Recipe Lab'),
          h('p', { class: 'muted' }, `${tr({ es: 'Receta', en: 'Recipe' }, lang)} ${Math.min(index + 1, RECIPE_LENGTH)} / ${RECIPE_LENGTH}`)),
        Button(`← ${tr({ es: 'Inicio', en: 'Home' }, lang)}`, { variant: 'ghost', href: '#/' })));

      if (closed) {
        wrap.append(Card([
          h('h2', {}, tr({ es: '¡Cocina terminada! 👩‍🍳', en: 'Kitchen closed! 👩‍🍳' }, lang)),
          h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'platos preparados', en: 'dishes made' }, lang) }, dishes.join(' · ')),
          h('p', {}, tr({ es: '¡Has seguido todas las recetas! Vuelve cuando quieras.', en: 'You followed every recipe! Come back whenever you like.' }, lang)),
          h('div', { class: 'row' },
            Button(tr({ es: 'Otra vez', en: 'Play again' }, lang), { onClick: () => ctx.refresh(), focusKey: 'play-again' }),
            Button(tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'secondary', href: '#/' })),
        ], 'sun', 'end-card'));
        return wrap;
      }

      const instruction = (l: typeof lang) => recipeSpeech(recipe, l);
      const ingredients = h('div', { class: 'ingredient-grid' }, ...INGREDIENTS.map((ingredient) =>
        h('div', { class: 'ingredient-card' },
          Button([
            h('span', { class: 'ingredient-card__emoji', 'aria-hidden': 'true' }, ingredient.emoji),
            h('span', { class: 'ingredient-card__name' }, biText(ingredient.name, lang)),
          ], {
            variant: 'ghost', className: 'ingredient-card__add', disabled: solved,
            focusKey: `ingredient-${ingredient.id}`, ariaLabel: `${ingredient.name[lang]} / ${ingredient.name[other(lang)]}`,
            onClick: () => add(ingredient.id, 1),
          }),
          h('div', { class: 'ingredient-card__count' },
            h('span', { 'aria-live': 'polite' }, `${bowl[ingredient.id] ?? 0}`),
            Button('−', {
              variant: 'ghost', className: 'btn--mini', disabled: solved || !(bowl[ingredient.id] > 0),
              ariaLabel: `${tr({ es: 'Quitar', en: 'Remove' }, lang)} ${ingredient.name[lang]}`,
              onClick: () => add(ingredient.id, -1),
            }))));

      const bowlItems = INGREDIENTS.filter((ingredient) => bowl[ingredient.id] > 0)
        .flatMap((ingredient) => Array.from({ length: bowl[ingredient.id] }, () => ingredient.emoji));
      const translateButton = Button(`🦜 ${tr({ es: 'Traducir', en: 'Translate' }, lang)}`, {
        variant: 'ghost', pressed: translate, focusKey: 'translate', onClick: () => { translate = !translate; draw(); },
      });
      wrap.append(
        h('div', { class: 'cols cols--map' },
          Panel(`📜 ${tr({ es: 'La receta', en: 'The recipe' }, lang)}`, [
            h('p', { class: 'clue', lang }, instruction(lang)),
            translate ? h('p', { class: 'clue clue--sub', lang: other(lang) }, instruction(other(lang))) : null,
            translateButton,
          ]),
          Panel(`🥣 ${tr({ es: 'El cuenco', en: 'The bowl' }, lang)}`, [
            h('p', { class: 'bowl bowl--recipe', role: 'img',
              'aria-label': `${tr({ es: 'Ingredientes añadidos', en: 'Ingredients added' }, lang)}: ${bowlItems.join(' ') || tr({ es: 'vacío', en: 'empty' }, lang)}` },
              bowlItems.join(' ') || '—'),
            h('p', { class: 'muted' }, `${tr({ es: 'Piezas en el cuenco', en: 'Pieces in the bowl' }, lang)}: ${recipeTotal({ lines: INGREDIENTS.filter((ingredient) => bowl[ingredient.id] > 0).map((ingredient) => ({ ingredient, quantity: bowl[ingredient.id] })) })}`),
            ingredients,
            solved ? null : Button(biText({ es: '¡Remover!', en: 'Stir!' }, lang), { onClick: stir, large: true, focusKey: 'stir' }),
          ]),
        ),
        h('div', { class: `message ${message ? 'message--on' : ''}`, role: 'status', 'aria-live': 'polite' }, message ? biText(message, lang) : null),
        solved ? Button(tr({ es: 'Siguiente receta →', en: 'Next recipe →' }, lang), { onClick: next, large: true, focusKey: 'next-recipe' }) : null,
      );
      return wrap;
    }, focusTarget);
  }

  draw();
  return Object.assign(() => undefined, {
    updateSettings(nextLang: typeof lang, nextBand: typeof band) {
      lang = nextLang;
      if (band !== nextBand) {
        band = nextBand;
        index = 0;
        recipe = generateRecipe(rng, band);
        bowl = {};
        solved = false;
        closed = false;
        message = null;
        dishes.length = 0;
      }
      draw();
    },
  });
};
