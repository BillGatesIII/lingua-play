import { other, tr, type Bi } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { updateProgress } from '../../shared/storage';
import type { Page } from '../../pages/types';
import { Button, Panel, biText } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  CHAMELEONS, COLORS, MAX_POTS, POTS, ROUND_LENGTH, generateRound, mix, mixFeedback,
  playfulClue, togglePot, type ColorId, type PotId,
} from './logic';

export const colorsPage: Page = (ctx) => {
  let { lang } = ctx;
  const rng = mulberry32((Date.now() ^ 0x27d4eb2f) >>> 0);
  let round = generateRound(rng);
  let index = 0;
  let bowl: PotId[] = [];
  let solved = false;
  let closed = false;
  let translate = false;

  const host = h('div', { class: 'world world--colors' });
  ctx.root.append(host);

  const target = (): ColorId => round[index];
  const mixed = (): ColorId | null => mix(bowl);

  function pour(pot: PotId) {
    if (solved || closed) return;
    bowl = togglePot(bowl, pot, MAX_POTS);
    if (mixed() === target()) {
      solved = true;
      const emoji = COLORS[target()].emoji;
      updateProgress((p) => {
        p.colors.painted += 1;
        if (!p.colors.colours.includes(emoji)) p.colors.colours.push(emoji);
      });
    }
    draw(solved ? 'next-chameleon' : undefined);
  }

  function next() {
    index++;
    bowl = [];
    solved = false;
    if (index >= ROUND_LENGTH) {
      closed = true;
      completeGameRound();
    }
    draw(closed ? 'play-again' : `pot-${POTS[0]}`);
  }

  function status(): Bi {
    const m = mixed();
    if (solved && m) return { es: `¡Sí! ¡Qué ${COLORS[m].name.es}! 🎉`, en: `Yes! Look at that ${COLORS[m].name.en}! 🎉` };
    if (!m) return { es: 'Toca los botes de pintura para mezclar.', en: 'Tap the paint pots to mix.' };
    return mixFeedback(m, rng);
  }

  const chameleon = (color: ColorId | null, label: string, happy = false): HTMLElement =>
    h('div', {
      class: `chameleon ${happy ? 'chameleon--happy' : ''}`.trim(),
      role: 'img',
      'aria-label': label,
      style: `--paint:${color ? COLORS[color].hex : '#fffaf0'}`,
    }, h('span', { 'aria-hidden': 'true' }, '🦎'));

  function pots(): HTMLElement {
    return h('div', { class: 'pots' }, ...POTS.map((pot) => {
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
      wrap.append(GameHeader({
        title: '🎨 Color Chameleon',
        noun: { es: 'Camaleón', en: 'Chameleon' },
        index, total: ROUND_LENGTH, lang,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'leaf',
          title: { es: '¡Qué galería tan colorida! 🖼️', en: 'What a colourful gallery! 🖼️' },
          art: h('div', { class: 'gallery' }, ...round.map((c) =>
            h('figure', { class: 'gallery__item' },
              chameleon(c, COLORS[c].name[lang], true),
              h('figcaption', {}, biText(COLORS[c].name, lang))))),
          body: { es: 'Los camaleones se van a descansar. ¡Vuelve cuando quieras!', en: 'The chameleons are off for a rest. Come back whenever you like!' },
          againLabel: { es: 'Otra vez', en: 'Play again' },
          againFocusKey: 'play-again',
          onAgain: () => {
            ctx.refresh();
            ctx.root.querySelector<HTMLElement>('[data-focus^="pot-"]:not(:disabled)')?.focus();
          },
          onBreakChange: () => draw(),
          lang,
        }));
        return wrap;
      }

      const pal = CHAMELEONS[index % CHAMELEONS.length];
      const clue = (l: typeof lang) => playfulClue(target(), index, l);
      const shown = mixed();

      append(wrap, [
        CharacterBubble({
          emoji: pal.emoji,
          mood: solved ? '✨' : undefined,
          name: tr(pal.name, lang),
          text: clue(lang),
          subText: clue(other(lang)),
          showSub: translate,
          lang,
          translatePressed: translate,
          onTranslate: () => { translate = !translate; draw(); },
          extra: h('span', { class: 'target-color' },
            h('span', {
              class: 'target-color__swatch',
              'aria-hidden': 'true',
              style: `--paint:${COLORS[target()].hex}`,
            }),
            h('span', { lang }, COLORS[target()].name[lang]),
            h('span', { class: 'target-color__sub', lang: other(lang) }, COLORS[target()].name[other(lang)])),
        }),
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'stage' },
            chameleon(shown, shown ? COLORS[shown].name[lang] : tr({ es: 'sin pintar', en: 'unpainted' }, lang), solved),
            h('p', {
              class: 'bowl', role: 'img',
              'aria-label': `${tr({ es: 'Cuenco de mezcla', en: 'Mixing bowl' }, lang)}: ${bowl.map((p) => COLORS[p].name[lang]).join(', ') || tr({ es: 'vacío', en: 'empty' }, lang)}`,
            },
            h('span', { 'aria-hidden': 'true' }, '🥣'),
            ...(bowl.length
              ? bowl.map((p) => h('span', { class: 'chip', 'aria-hidden': 'true', style: `--paint:${COLORS[p].hex}` }))
              : [h('span', { class: 'muted' }, '—')]))),
          Panel(`🎨 ${tr({ es: 'Pintura', en: 'Paint' }, lang)} (${bowl.length}/${MAX_POTS})`, [
            pots(),
            Button(tr({ es: 'Vaciar el cuenco', en: 'Empty the bowl' }, lang), {
              variant: 'ghost', disabled: solved || bowl.length === 0, focusKey: 'empty',
              onClick: () => { bowl = []; draw(`pot-${POTS[0]}`); },
            }),
          ])),
        StatusBanner(status(), lang, true),
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
