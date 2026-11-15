import { other, tr, type Bi } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32, shuffle } from '../../shared/rng';
import { updateProgress } from '../../shared/storage';
import type { Page } from '../../pages/types';
import { Button, Panel } from '../../ui/components';
import { append, h, svg } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  CHEFS, INGREDIENTS, RECIPES_PER_ROUND, SCOOPS, VERBS, checkRecipe, generateRecipe,
  quartersBadge, recipeSpeech, type Recipe, type VerbId,
} from './logic';

export const recipePage: Page = (ctx) => {
  let { lang } = ctx;
  const rng = mulberry32((Date.now() ^ 0x517cc1b7) >>> 0);
  const chefs = shuffle(rng, CHEFS);
  let index = 0;
  let recipe: Recipe = generateRecipe(rng, index);
  let chosen: string[] = [];
  let quarters = 0;
  let solved = false;
  let closed = false;
  let translate = false;
  let message: Bi | null = null;
  const cooked: string[] = [];

  const host = h('div', { class: 'world world--recipe' });
  ctx.root.append(host);

  const say = (m: Bi | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function toggleIngredient(id: string) {
    if (solved || closed) return;
    chosen = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
    say(null);
  }

  function addScoop(q: number) {
    if (solved || closed) return;
    quarters = Math.min(recipe.maxQuarters, quarters + q);
    say(null);
  }

  function tryVerb(verbId: VerbId) {
    if (solved || closed) return;
    const res = checkRecipe(recipe, chosen, quarters, verbId);
    if (!res.ok) return say(res.reason, `verb-${verbId}`);
    solved = true;
    cooked.push(recipe.dish.emoji);
    updateProgress((p) => {
      p.recipe.cooked += 1;
      if (!p.recipe.dishes.includes(recipe.dish.emoji)) p.recipe.dishes.push(recipe.dish.emoji);
    });
    say({
      es: `¡Ñam! ${recipe.dish.emoji} ¡Qué ${recipe.dish.name.es} tan deliciosa!`,
      en: `Yum! ${recipe.dish.emoji} What a delicious ${recipe.dish.name.en}!`,
    }, 'next-dish');
  }

  function nextDish() {
    index++;
    if (index >= RECIPES_PER_ROUND) {
      closed = true;
      completeGameRound();
    } else {
      recipe = generateRecipe(rng, index);
      chosen = [];
      quarters = 0;
      solved = false;
    }
    message = null;
    draw(closed ? 'another-kitchen' : `ing-${INGREDIENTS[0].id}`);
  }

  function measuringJug(): SVGSVGElement {
    const max = recipe.maxQuarters;
    const fillRatio = Math.min(1, quarters / max);
    const innerH = 120;
    const fillH = Math.round(innerH * fillRatio);
    const fillY = 20 + (innerH - fillH);
    const ticks: SVGElement[] = [];
    for (let q = 1; q <= max; q++) {
      const y = 140 - (q / max) * innerH;
      const major = q % 4 === 0;
      ticks.push(svg('line', {
        x1: major ? 42 : 48, x2: 64, y1: y, y2: y,
        stroke: '#1f1b3d', 'stroke-width': major ? 3 : 2,
      }));
      if (major || q === 2 || q === 6) {
        ticks.push(svg('text', {
          x: 36, y: y + 4, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 900, fill: '#1f1b3d',
        }, quartersBadge(q)));
      }
    }
    return svg('svg', { class: 'jug-svg', viewBox: '0 0 180 165', 'aria-hidden': 'true' },
      svg('rect', { x: 42, y: 20, width: 92, height: 120, rx: 14, fill: '#fffaf0', stroke: '#1f1b3d', 'stroke-width': 4 }),
      fillH > 0
        ? svg('rect', { x: 46, y: fillY, width: 84, height: fillH, rx: 10, fill: recipe.dish.color, opacity: 0.85 })
        : null,
      svg('path', { d: 'M134 45 C158 45, 158 105, 134 105', fill: 'none', stroke: '#1f1b3d', 'stroke-width': 5, 'stroke-linecap': 'round' }),
      ...ticks,
    );
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🍳 Recipe Lab',
        noun: { es: 'Receta', en: 'Recipe' },
        index, total: RECIPES_PER_ROUND, lang,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'peach',
          title: { es: '¡Cocina cerrada por hoy! 👨‍🍳', en: 'Kitchen closed for today! 👨‍🍳' },
          art: h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'platos', en: 'dishes' }, lang) }, cooked.join(' ')),
          body: { es: 'Todos los amigos terminaron felices y con la barriga llena.', en: 'All your friends left happy with full tummies!' },
          againLabel: { es: 'Cocinar otra vez', en: 'Cook again' },
          againFocusKey: 'another-kitchen',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
          lang,
        }));
        return wrap;
      }

      const chef = chefs[index % chefs.length];
      const maxLabel = quartersBadge(recipe.maxQuarters);
      const jugLabel = `${tr({ es: 'Jarra medidora', en: 'Measuring jug' }, lang)}: ${quartersBadge(quarters)} / ${maxLabel} ${tr({ es: 'tazas', en: 'cups' }, lang)}`;

      append(wrap, [
        CharacterBubble({
          emoji: chef.emoji,
          mood: solved ? recipe.dish.emoji : undefined,
          name: tr(chef.name, lang),
          text: recipeSpeech(recipe, lang),
          subText: recipeSpeech(recipe, other(lang)),
          showSub: translate,
          lang,
          translatePressed: translate,
          onTranslate: () => { translate = !translate; draw(); },
        }),
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'jug-stage' },
            measuringJug(),
            h('p', { class: 'jug-readout', role: 'img', 'aria-label': jugLabel },
              `${recipe.dish.emoji} ${quartersBadge(quarters)} ${tr({ es: 'taza(s)', en: 'cup(s)' }, lang)}`),
            chosen.length
              ? h('p', { class: 'bowl' },
                  ...chosen.map((id) => INGREDIENTS.find((i) => i.id === id)!.emoji))
              : null),
          h('div', {},
            Panel(`🧺 1. ${tr({ es: 'Ingredientes', en: 'Ingredients' }, lang)}`, [
              h('div', { class: 'ingredients' }, ...INGREDIENTS.map((ing) =>
                Button([
                  h('span', { class: 'ing-btn__emoji', 'aria-hidden': 'true' }, ing.emoji),
                  h('span', { class: 'bi' },
                    h('span', { class: 'bi__main', lang }, ing.name[lang]),
                    h('span', { class: 'bi__sub', lang: other(lang) }, ing.name[other(lang)])),
                ], {
                  variant: 'ghost', className: 'ing-btn', pressed: chosen.includes(ing.id), disabled: solved,
                  focusKey: `ing-${ing.id}`, ariaLabel: `${ing.name[lang]} / ${ing.name[other(lang)]}`,
                  onClick: () => toggleIngredient(ing.id),
                }))),
            ]),
            Panel(`🥛 2. ${tr({ es: 'Medir', en: 'Measure' }, lang)}`, [
              h('div', { class: 'scoops' },
                ...SCOOPS.filter((s) => s <= recipe.maxQuarters).map((s) =>
                  Button(`+ ${quartersBadge(s)}`, {
                    variant: 'secondary', disabled: solved || quarters >= recipe.maxQuarters,
                    focusKey: `scoop-${s}`,
                    ariaLabel: `${tr({ es: 'Añadir', en: 'Add' }, lang)} ${quartersBadge(s)}`,
                    onClick: () => addScoop(s),
                  })),
                Button(tr({ es: 'Vaciar', en: 'Empty' }, lang), {
                  variant: 'ghost', disabled: solved || quarters === 0, focusKey: 'empty-jug',
                  onClick: () => { quarters = 0; say(null); },
                })),
            ]),
            Panel(`👩‍🍳 3. ${tr({ es: 'Paso final', en: 'Final step' }, lang)}`, [
              h('div', { class: 'verbs' }, ...VERBS.map((v) =>
                Button([
                  h('span', { 'aria-hidden': 'true' }, v.emoji),
                  h('span', { class: 'bi' },
                    h('span', { class: 'bi__main', lang }, v.label[lang]),
                    h('span', { class: 'bi__sub', lang: other(lang) }, v.label[other(lang)])),
                ], {
                  variant: 'primary', disabled: solved, focusKey: `verb-${v.id}`,
                  ariaLabel: `${v.label[lang]} / ${v.label[other(lang)]}`,
                  onClick: () => tryVerb(v.id),
                }))),
            ]))),
        StatusBanner(message, lang),
        solved ? Button(tr({ es: 'Siguiente receta →', en: 'Next recipe →' }, lang), { onClick: nextDish, large: true, focusKey: 'next-dish' }) : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
  return Object.assign(() => undefined, {
    updateSettings(nextLang: typeof lang) {
      lang = nextLang;
      draw();
    },
  });
};
