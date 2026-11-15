import { other, tr, type Bi } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { updateProgress } from '../../shared/storage';
import type { Page } from '../../pages/types';
import { Button, Panel } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  FLOWERS, GARDEN_LENGTH, gardenMistake, generatePattern, isPatternSolved, type PatternPuzzle,
} from './logic';

const STAGES = ['🌱', '🌿', '🌷', '🌻'] as const;

export const gardenPage: Page = (ctx) => {
  let { lang } = ctx;
  const rng = mulberry32((Date.now() ^ 0x369dea0f) >>> 0);
  let index = 0;
  let puzzle: PatternPuzzle = generatePattern(rng, index);
  let triedWrong = new Map<number, string>();
  let solved = false;
  let closed = false;
  let translate = false;
  let message: Bi | null = null;
  const flowers: string[] = [];
  const host = h('div', { class: 'world world--garden' });
  ctx.root.append(host);

  function choose(value: number) {
    if (solved || closed || triedWrong.has(value)) return;
    if (isPatternSolved(puzzle, value)) {
      solved = true;
      const bloom = FLOWERS[index % FLOWERS.length];
      flowers.push(bloom);
      updateProgress((p) => {
        p.garden.planted += 1;
        if (!p.garden.flowers.includes(bloom)) p.garden.flowers.push(bloom);
      });
      message = { es: `¡Floreció el jardín! ${bloom} ¡La secuencia está completa!`, en: `The garden bloomed! ${bloom} The pattern is complete!` };
    } else {
      const oops = gardenMistake(rng);
      triedWrong = new Map(triedWrong).set(value, oops.badge);
      message = oops.text;
    }
    draw(solved ? 'next-pattern' : undefined);
  }

  function next() {
    index++;
    if (index >= GARDEN_LENGTH) {
      closed = true;
      completeGameRound();
    } else {
      puzzle = generatePattern(rng, index);
      triedWrong = new Map();
      solved = false;
    }
    message = null;
    draw(closed ? 'play-again' : `choice-${puzzle.choices[0]}`);
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🌷 Bloom Garden',
        noun: { es: 'Macizo', en: 'Flower bed' },
        index, total: GARDEN_LENGTH, lang,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'leaf',
          title: { es: '¡Qué jardín tan bonito! 🌼', en: 'What a lovely garden! 🌼' },
          art: h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'flores', en: 'flowers' }, lang) }, flowers.join(' ')),
          body: { es: 'Las abejas y las flores te dan las gracias. ¡Vuelve cuando quieras!', en: 'The bees and flowers say thank you. Come back whenever you like!' },
          againLabel: { es: 'Otra vez', en: 'Play again' },
          againFocusKey: 'play-again',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
          lang,
        }));
        return wrap;
      }

      const seqLabel = puzzle.slots
        .map((v) => (v === null ? tr({ es: 'desconocido', en: 'missing' }, lang) : String(v)))
        .join(', ');

      const pots = puzzle.slots.map((value, i) => {
        if (value === null && !solved) {
          return h('div', { class: 'flower-pot flower-pot--empty', 'aria-hidden': 'true' },
            h('span', {}, '🕳️'), h('strong', {}, '❔'));
        }
        const shown = value === null ? puzzle.answer : value;
        const icon = solved ? FLOWERS[index % FLOWERS.length] : STAGES[Math.min(i, STAGES.length - 1)];
        return h('div', { class: `flower-pot ${value === null && solved ? 'flower-pot--bloomed' : ''}`.trim() },
          h('span', { 'aria-hidden': 'true' }, icon), h('strong', {}, String(shown)));
      });

      append(wrap, [
        CharacterBubble({
          emoji: '🐝',
          mood: solved ? FLOWERS[index % FLOWERS.length] : undefined,
          name: tr({ es: 'Abeja Maya', en: 'Maya the bee' }, lang),
          text: puzzle.instruction[lang],
          subText: puzzle.instruction[other(lang)],
          showSub: translate,
          lang,
          translatePressed: translate,
          onTranslate: () => { translate = !translate; draw(); },
        }),
        Panel(`🪴 ${tr({ es: 'Planta el paquete de semillas correcto', en: 'Plant the right seed packet' }, lang)}`, [
          h('div', { class: 'flower-sequence', 'aria-label': `${tr({ es: 'Secuencia', en: 'Sequence' }, lang)}: ${seqLabel}` }, ...pots),
          h('div', { class: 'number-choices' }, ...puzzle.choices.map((value) => {
            const wrongBadge = triedWrong.get(value);
            return Button(`${wrongBadge ?? '🌱'} ${value}`, {
              variant: wrongBadge ? 'ghost' : 'secondary',
              className: 'number-choice',
              disabled: solved || Boolean(wrongBadge),
              focusKey: `choice-${value}`,
              ariaLabel: `${tr({ es: 'Plantar', en: 'Plant' }, lang)} ${value}`,
              onClick: () => choose(value),
            });
          })),
        ]),
        StatusBanner(message, lang),
        solved ? Button(tr({ es: 'Siguiente macizo →', en: 'Next flower bed →' }, lang), { onClick: next, large: true, focusKey: 'next-pattern' }) : null,
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
