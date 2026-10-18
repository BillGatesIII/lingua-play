import { other, tr, type Bi } from '../../shared/i18n';
import { mulberry32 } from '../../shared/rng';
import type { Page } from '../../pages/types';
import { Button, Card, Panel, biText } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { GARDEN_LENGTH, generatePattern, isPatternSolved, type PatternPuzzle } from './logic';

export const gardenPage: Page = (ctx) => {
  let { lang, band } = ctx;
  const rng = mulberry32((Date.now() ^ 0x369dea0f) >>> 0);
  let index = 0;
  let puzzle: PatternPuzzle = generatePattern(rng, band, index);
  let solved = false;
  let closed = false;
  let translate = false;
  let message: Bi | null = null;
  const flowers: string[] = [];
  const host = h('div', { class: 'world world--garden' });
  ctx.root.append(host);

  function choose(value: number) {
    if (solved || closed) return;
    if (isPatternSolved(puzzle, value)) {
      solved = true;
      flowers.push('🌷');
      message = { es: '¡La secuencia sigue creciendo! 🌱', en: 'The pattern keeps growing! 🌱' };
    } else {
      message = { es: '¡Mira cómo cambia cada maceta e inténtalo de nuevo!', en: 'Watch how each flower bed changes and try again!' };
    }
    draw(solved ? 'next-pattern' : undefined);
  }

  function next() {
    index++;
    if (index >= GARDEN_LENGTH) closed = true;
    else {
      puzzle = generatePattern(rng, band, index);
      solved = false;
    }
    message = null;
    draw(closed ? 'play-again' : 'next-pattern');
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(h('header', { class: 'game__head' },
        h('div', {}, h('h1', { class: 'game__title' }, '🌷 Number Garden'),
          h('p', { class: 'muted' }, `${tr({ es: 'Macizo', en: 'Flower bed' }, lang)} ${Math.min(index + 1, GARDEN_LENGTH)} / ${GARDEN_LENGTH}`)),
        Button(`← ${tr({ es: 'Inicio', en: 'Home' }, lang)}`, { variant: 'ghost', href: '#/' })));

      if (closed) {
        wrap.append(Card([
          h('h2', {}, tr({ es: '¡Qué jardín tan bonito! 🌼', en: 'What a lovely garden! 🌼' }, lang)),
          h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'flores', en: 'flowers' }, lang) }, flowers.join(' ')),
          h('p', {}, tr({ es: 'Las flores siguen creciendo. ¡Vuelve cuando quieras!', en: 'The flowers will keep growing. Come back whenever you like!' }, lang)),
          h('div', { class: 'row' },
            Button(tr({ es: 'Otra vez', en: 'Play again' }, lang), { onClick: () => ctx.refresh(), focusKey: 'play-again' }),
            Button(tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'secondary', href: '#/' })),
        ], 'sun', 'end-card'));
        return wrap;
      }

      const instruction = (l: typeof lang) => puzzle.instruction[l];
      append(wrap, [
        h('div', { class: 'cols cols--map' },
          Panel(`🌱 ${tr({ es: 'La pista del jardín', en: 'Garden clue' }, lang)}`, [
            h('p', { class: 'clue', lang }, instruction(lang)),
            translate ? h('p', { class: 'clue clue--sub', lang: other(lang) }, instruction(other(lang))) : null,
            Button(`🦜 ${tr({ es: 'Traducir', en: 'Translate' }, lang)}`, { variant: 'ghost', pressed: translate, focusKey: 'translate', onClick: () => { translate = !translate; draw(); } }),
          ]),
          Panel(`🪴 ${tr({ es: '¿Qué crece después?', en: 'What grows next?' }, lang)}`, [
            h('div', { class: 'flower-sequence', 'aria-label': `${tr({ es: 'Secuencia', en: 'Sequence' }, lang)}: ${puzzle.sequence.join(', ')}, ${tr({ es: 'desconocido', en: 'unknown' }, lang)}` },
              ...puzzle.sequence.map((value) => h('div', { class: 'flower-pot' },
                h('span', { 'aria-hidden': 'true' }, '🌼'), h('strong', {}, String(value)))),
              h('div', { class: 'flower-pot flower-pot--empty', 'aria-hidden': 'true' }, '❔')),
            h('div', { class: 'number-choices' }, ...puzzle.choices.map((value) => Button(String(value), {
              variant: 'secondary', className: 'number-choice', disabled: solved,
              focusKey: `choice-${value}`, ariaLabel: `${tr({ es: 'Elegir', en: 'Choose' }, lang)} ${value}`,
              onClick: () => choose(value),
            }))),
          ]),
        ),
        h('div', { class: `message ${message ? 'message--on' : ''}`, role: 'status', 'aria-live': 'polite' }, message ? biText(message, lang) : null),
        solved ? Button(tr({ es: 'Siguiente macizo →', en: 'Next flower bed →' }, lang), { onClick: next, large: true, focusKey: 'next-pattern' }) : null,
      ]);
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
        puzzle = generatePattern(rng, band, index);
        solved = false;
        closed = false;
        message = null;
        flowers.length = 0;
      }
      draw();
    },
  });
};
