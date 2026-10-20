import { other, tr, type Bi } from '../../shared/i18n';
import { mulberry32 } from '../../shared/rng';
import type { Page } from '../../pages/types';
import { Button, Card, Panel, biText } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { createAdaptiveChallenge } from '../../shared/adaptive';
import {
  COLORS, ROUND_LENGTH, clueText, generateRound, maxPots, mix, potsForLevel, togglePot, type ColorId, type PotId,
} from './logic';

export const colorsPage: Page = (ctx) => {
  let { lang } = ctx;
  const challenge = createAdaptiveChallenge();
  const rng = mulberry32((Date.now() ^ 0x27d4eb2f) >>> 0);
  let round = generateRound(rng, challenge.level);
  let index = 0;
  let bowl: PotId[] = [];
  let solved = false;
  let closed = false;
  let translate = false;
  let attempts = 0;

  const host = h('div', { class: 'world world--colors' });
  ctx.root.append(host);

  const target = (): ColorId => round[index];
  const mixed = (): ColorId | null => mix(bowl);

  function pour(pot: PotId) {
    if (solved || closed) return;
    attempts++;
    bowl = togglePot(bowl, pot, maxPots(challenge.level));
    if (mixed() === target()) {
      solved = true;
      challenge.complete(attempts <= 2 ? 0 : attempts >= 5 ? 2 : 1);
    }
    draw(solved ? 'next-chameleon' : undefined);
  }

  function next() {
    index++;
    bowl = [];
    attempts = 0;
    solved = false;
    if (index >= ROUND_LENGTH) closed = true;
    draw(closed ? 'play-again' : `pot-${potsForLevel(challenge.level)[0]}`);
  }

  function status(): Bi {
    const m = mixed();
    if (solved && m) return { es: `¡Sí! ¡Qué ${COLORS[m].name.es}! 🎉`, en: `Yes! Look at that ${COLORS[m].name.en}! 🎉` };
    if (!m) return { es: 'Toca los botes de pintura para mezclar.', en: 'Tap the paint pots to mix.' };
    return {
      es: `Tu camaleón ahora es ${COLORS[m].name.es}. ¡Prueba otra mezcla!`,
      en: `Your chameleon is now ${COLORS[m].name.en}. Try another mix!`,
    };
  }

  const chameleon = (color: ColorId | null, label: string): HTMLElement =>
    h('div', { class: 'chameleon', role: 'img', 'aria-label': label, style: `--paint:${color ? COLORS[color].hex : '#fffaf0'}` },
      h('span', { 'aria-hidden': 'true' }, '🦎'));

  function pots(): HTMLElement {
    return h('div', { class: 'pots' }, ...potsForLevel(challenge.level).map((pot) => {
      const c = COLORS[pot];
      return Button([
        h('span', { class: 'pot__swatch', 'aria-hidden': 'true', style: `--paint:${c.hex}` }),
        h('span', { class: 'bi' }, h('span', { class: 'bi__main', lang }, c.name[lang]), h('span', { class: 'bi__sub', lang: other(lang) }, c.name[other(lang)])),
      ], {
        variant: 'ghost', className: 'pot', pressed: bowl.includes(pot), disabled: solved, focusKey: `pot-${pot}`,
        ariaLabel: `${c.name[lang]} / ${c.name[other(lang)]}`, onClick: () => pour(pot),
      });
    }));
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(h('header', { class: 'game__head' },
        h('div', {}, h('h1', { class: 'game__title' }, '🎨 Color Chameleon'),
          h('p', { class: 'muted' }, `${tr({ es: 'Camaleón', en: 'Chameleon' }, lang)} ${Math.min(index + 1, ROUND_LENGTH)} / ${ROUND_LENGTH}`)),
        Button('← ' + tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'ghost', href: '#/' })));

      if (closed) {
        wrap.append(Card([
          h('h2', {}, tr({ es: '¡Qué galería tan colorida! 🖼️', en: 'What a colourful gallery! 🖼️' }, lang)),
          h('div', { class: 'gallery' }, ...round.map((c) => h('figure', { class: 'gallery__item' },
            chameleon(c, COLORS[c].name[lang]), h('figcaption', {}, biText(COLORS[c].name, lang))))),
          h('p', {}, tr({ es: 'Los camaleones se van a descansar. ¡Vuelve cuando quieras!', en: 'The chameleons are off for a rest. Come back whenever you like!' }, lang)),
          h('div', { class: 'row' },
            Button(tr({ es: 'Otra vez', en: 'Play again' }, lang), { onClick: () => {
              ctx.refresh();
              ctx.root.querySelector<HTMLElement>('[data-focus^="pot-"]:not(:disabled)')?.focus();
            }, focusKey: 'play-again' }),
            Button(tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'secondary', href: '#/' })),
        ], 'sun', 'end-card'));
        return wrap;
      }

      const clue = (l: typeof lang) => clueText(target(), l);
      const shown = mixed();
      append(wrap, [
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'stage' },
            chameleon(shown, shown ? COLORS[shown].name[lang] : tr({ es: 'sin pintar', en: 'unpainted' }, lang)),
            h('p', { class: 'bowl', role: 'img',
              'aria-label': `${tr({ es: 'Cuenco de mezcla', en: 'Mixing bowl' }, lang)}: ${bowl.map((p) => COLORS[p].name[lang]).join(', ') || tr({ es: 'vacío', en: 'empty' }, lang)}` },
              h('span', { 'aria-hidden': 'true' }, '🥣 '), bowl.map((p) => COLORS[p].emoji).join(' ') || '—')),
          h('div', {},
            Panel(`📜 ${tr({ es: 'Pedido', en: 'Request' }, lang)}`, [
              h('p', { class: 'clue', lang }, clue(lang)),
              translate ? h('p', { class: 'clue clue--sub', lang: other(lang) }, clue(other(lang))) : null,
              Button(`🦜 ${tr({ es: 'Traducir', en: 'Translate' }, lang)}`, { variant: 'ghost', pressed: translate, focusKey: 'translate', onClick: () => { translate = !translate; draw(); } }),
            ]),
            Panel(`🎨 ${tr({ es: 'Pintura', en: 'Paint' }, lang)}`, [
              pots(),
              Button(tr({ es: 'Vaciar el cuenco', en: 'Empty the bowl' }, lang), { variant: 'ghost', disabled: solved || bowl.length === 0, focusKey: 'empty', onClick: () => { bowl = []; draw(`pot-${potsForLevel(challenge.level)[0]}`); } }),
            ])),
        ),
        h('div', { class: 'message message--on', role: 'status', 'aria-live': 'polite', 'data-live': 'message' }, biText(status(), lang)),
        solved ? Button(tr({ es: 'Siguiente camaleón →', en: 'Next chameleon →' }, lang), { onClick: next, large: true, focusKey: 'next-chameleon' }) : null,
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
