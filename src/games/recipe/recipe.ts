import { diagnoseRecipeMistake, scaffoldVocab } from '../../shared/coach';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32, shuffle } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { createGameDirector } from '../../shared/speechDirector';
import { updateProgress } from '../../shared/storage';
import { speakEnglish } from '../../shared/voice';
import type { Page } from '../../pages/types';
import { Button, Panel, SpeakButton } from '../../ui/components';
import { append, h, svg } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  CHEFS, DISHES, INGREDIENTS, RECIPES_PER_ROUND, SCOOPS, VERBS, checkRecipe, generateRecipe,
  quartersBadge, quartersText, recipeSpeech, type Recipe, type VerbId,
} from './logic';

export const recipePage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x517cc1b7) >>> 0);
  const director = createGameDirector(rng);
  const chefs = shuffle(rng, CHEFS);
  const roundDishes = shuffle(rng, DISHES).slice(0, RECIPES_PER_ROUND);
  let index = 0;
  let recipe: Recipe = generateRecipe(rng, index, roundDishes[index]);
  let chosen: string[] = [];
  let quarters = 0;
  let solved = false;
  let closed = false;
  let message: string | null = null;
  const cooked: string[] = [];

  const host = h('div', { class: 'world world--recipe' });
  ctx.root.append(host);

  const say = (m: string | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function toggleIngredient(id: string, anchor?: HTMLElement) {
    if (solved || closed) return;
    const removing = chosen.includes(id);
    chosen = removing ? chosen.filter((x) => x !== id) : [...chosen, id];
    playSfx(removing ? 'remove' : 'pop');
    if (!removing) {
      const ing = INGREDIENTS.find((x) => x.id === id)!;
      const label = scaffoldVocab(ing.name.en, 'ingredient', rng, ing.name.en);
      speakEnglish(label, {
        anchor,
        mode: 'click',
        role: 'step',
        topic: label,
        coalesceKey: 'recipe-ing',
      });
    }
    say(null);
  }

  function addScoop(q: number, anchor?: HTMLElement) {
    if (solved || closed) return;
    quarters = Math.min(recipe.maxQuarters, quarters + q);
    playSfx('splash');
    speakEnglish(quartersText(quarters, 'en'), {
      anchor,
      mode: 'click',
      role: 'step',
      topic: `recipe-q-${quarters}`,
      coalesceKey: 'recipe-jug',
    });
    say(null);
  }

  function tryVerb(verbId: VerbId, anchor?: HTMLElement) {
    if (solved || closed) return;
    const res = checkRecipe(recipe, chosen, quarters, verbId, rng);
    if (!res.ok) {
      playSfx('oops');
      const advice = diagnoseRecipeMistake(recipe, chosen, quarters, verbId);
      const line = director.encourage(advice.hint, advice.first ?? res.reason.en);
      speakEnglish(line, { anchor, mode: 'event' });
      return say(res.reason.es, `verb-${verbId}`);
    }
    solved = true;
    cooked.push(recipe.dish.emoji);
    updateProgress((p) => {
      p.recipe.cooked += 1;
      if (!p.recipe.dishes.includes(recipe.dish.emoji)) p.recipe.dishes.push(recipe.dish.emoji);
    });
    playSfx('surprise');
    speakEnglish(director.celebrate(`Yum, ${recipe.dish.name.en}!`), { anchor, mode: 'event' });
    say(`¡Ñam! ${recipe.dish.emoji} ¡Qué ${recipe.dish.name.es} tan deliciosa!`, 'next-dish');
  }

  function nextDish() {
    index++;
    director.nextPuzzle();
    if (index >= RECIPES_PER_ROUND) {
      closed = true;
      completeGameRound();
      playSfx('levelUp');
      speakEnglish(director.pickLine('kitchen-end', [
        'Kitchen closed for today! Great cooking!',
        'Splendid chef! Every dish was delicious!',
        'Lovely cooking! Time to hang up the apron!',
        'Marvellous feast! Well done, chef!',
      ]), { mode: 'event' });
    } else {
      recipe = generateRecipe(rng, index, roundDishes[index]);
      chosen = [];
      quarters = 0;
      solved = false;
      playSfx('step');
      const chefName = chefs[index % chefs.length].name.en;
      const intro = director.transition('next-chef', [
        chefName,
        `Next order from ${chefName}!`,
        `${chefName} is hungry!`,
      ], 2);
      if (intro) speakEnglish(intro, { mode: 'event' });
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
        noun: 'Receta',
        index, total: RECIPES_PER_ROUND,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'peach',
          title: '¡Cocina cerrada por hoy! 👨‍🍳',
          art: h('p', { class: 'big-emoji', 'aria-label': 'platos' }, cooked.join(' ')),
          body: 'Todos los amigos terminaron felices y con la barriga llena.',
          againLabel: 'Cocinar otra vez',
          againVoice: 'Cook again',
          againFocusKey: 'another-kitchen',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
        }));
        return wrap;
      }

      const chef = chefs[index % chefs.length];
      const maxLabel = quartersBadge(recipe.maxQuarters);
      const jugLabel = `Jarra medidora: ${quartersBadge(quarters)} / ${maxLabel} tazas`;
      const jugEnglish = quarters > 0 ? quartersText(quarters, 'en') : 'empty';
      const jugReadout = SpeakButton(`${recipe.dish.emoji} ${quartersBadge(quarters)} taza(s)`, {
        english: jugEnglish,
        className: 'jug-readout jug-readout--btn',
        ariaLabel: `${jugLabel} (escuchar en inglés)`,
      });

      const measureControls = h('div', { class: 'jug-controls' },
        h('p', { class: 'jug-controls__title' }, '🥛 Medir'),
        h('div', { class: 'scoops' },
          ...SCOOPS.filter((s) => s <= recipe.maxQuarters).map((s) =>
            Button(`+ ${quartersBadge(s)}`, {
              variant: 'secondary',
              disabled: solved || quarters >= recipe.maxQuarters,
              focusKey: `scoop-${s}`,
              ariaLabel: `Añadir ${quartersBadge(s)}`,
              voiceHover: quartersText(s, 'en'),
              voiceRole: 'vocab',
              onClick: (e) => addScoop(s, e.currentTarget as HTMLElement),
            })),
          Button('Vaciar', {
            variant: 'ghost',
            disabled: solved || quarters === 0,
            focusKey: 'empty-jug',
            voiceHover: 'Empty',
            onClick: () => { playSfx('remove'); quarters = 0; say(null); },
          }),
        ),
      );

      append(wrap, [
        CharacterBubble({
          emoji: chef.emoji,
          mood: solved ? recipe.dish.emoji : undefined,
          name: chef.name.es,
          englishName: chef.name.en,
          text: recipeSpeech(recipe, 'es', index),
          englishText: recipeSpeech(recipe, 'en', index),
        }),
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'jug-stage' },
            measuringJug(),
            jugReadout,
            measureControls,
            chosen.length
              ? h('p', { class: 'bowl' },
                  ...chosen.map((id) => INGREDIENTS.find((i) => i.id === id)!.emoji))
              : null),
          h('div', {},
            Panel('🧺 1. Ingredientes', [
              h('div', { class: 'ingredients' }, ...INGREDIENTS.map((ing) =>
                Button([
                  h('span', { class: 'ing-btn__emoji', 'aria-hidden': 'true' }, ing.emoji),
                  h('span', { lang: 'es' }, ing.name.es),
                ], {
                  variant: 'ghost',
                  className: 'ing-btn',
                  pressed: chosen.includes(ing.id),
                  disabled: solved,
                  focusKey: `ing-${ing.id}`,
                  ariaLabel: ing.name.es,
                  voiceHover: ing.name.en,
                  voiceRole: 'vocab',
                  onClick: (e) => toggleIngredient(ing.id, e.currentTarget as HTMLElement),
                }))),
            ]),
            Panel('👩‍🍳 2. Paso final', [
              h('div', { class: 'verbs' }, ...VERBS.map((v) =>
                Button([
                  h('span', { 'aria-hidden': 'true' }, v.emoji),
                  h('span', { lang: 'es' }, v.label.es),
                ], {
                  variant: 'primary',
                  disabled: solved,
                  focusKey: `verb-${v.id}`,
                  ariaLabel: v.label.es,
                  voiceHover: v.label.en,
                  voiceRole: 'vocab',
                  onClick: (e) => tryVerb(v.id, e.currentTarget as HTMLElement),
                }))),
            ]))),
        StatusBanner(message),
        solved
          ? Button('Siguiente receta →', {
              onClick: nextDish,
              large: true,
              focusKey: 'next-dish',
              voiceHover: 'Next recipe',
            })
          : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
};
