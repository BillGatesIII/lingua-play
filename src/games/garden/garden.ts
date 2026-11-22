import type { Bi } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { updateProgress } from '../../shared/storage';
import { addHoverVoice, speakEnglish } from '../../shared/voice';
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
  const rng = mulberry32((Date.now() ^ 0x369dea0f) >>> 0);
  let index = 0;
  let puzzle: PatternPuzzle = generatePattern(rng, index);
  let triedWrong = new Map<number, string>();
  let solved = false;
  let closed = false;
  let endCelebrated = false;
  let message: Bi | null = null;
  const flowers: string[] = [];
  const host = h('div', { class: 'world world--garden' });
  ctx.root.append(host);

  function choose(value: number, anchor?: HTMLElement) {
    if (solved || closed || triedWrong.has(value)) return;
    if (isPatternSolved(puzzle, value)) {
      solved = true;
      const bloom = FLOWERS[index % FLOWERS.length];
      flowers.push(bloom);
      updateProgress((p) => {
        p.garden.planted += 1;
        if (!p.garden.flowers.includes(bloom)) p.garden.flowers.push(bloom);
      });
      playSfx('surprise');
      speakEnglish(`${value}! The garden bloomed!`, { anchor, mode: 'click' });
      message = { es: `¡Floreció el jardín! ${bloom} ¡La secuencia está completa!`, en: `The garden bloomed! ${bloom} The pattern is complete!` };
    } else {
      const oops = gardenMistake(rng);
      triedWrong = new Map(triedWrong).set(value, oops.badge);
      playSfx('oops');
      speakEnglish('Oops! Try another!', { anchor, mode: 'click' });
      message = oops.text;
    }
    draw(solved ? 'next-pattern' : undefined);
  }

  function next() {
    index++;
    if (index >= GARDEN_LENGTH) {
      closed = true;
      completeGameRound();
      if (!endCelebrated) {
        endCelebrated = true;
        playSfx('levelUp');
      }
      speakEnglish('What a lovely garden!');
    } else {
      puzzle = generatePattern(rng, index);
      triedWrong = new Map();
      solved = false;
      playSfx('step');
      speakEnglish('Next flower bed!');
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
        index, total: GARDEN_LENGTH,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'leaf',
          title: { es: '¡Qué jardín tan bonito! 🌼', en: 'What a lovely garden! 🌼' },
          art: h('p', { class: 'big-emoji', 'aria-label': 'flores' }, flowers.join(' ')),
          body: { es: 'Las abejas y las flores te dan las gracias. ¡Vuelve cuando quieras!', en: 'The bees and flowers say thank you. Come back whenever you like!' },
          againLabel: { es: 'Otra vez', en: 'Play again' },
          againFocusKey: 'play-again',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
        }));
        return wrap;
      }

      const seqLabel = puzzle.slots
        .map((v) => (v === null ? 'desconocido' : String(v)))
        .join(', ');

      const pots = puzzle.slots.map((value, i) => {
        if (value === null && !solved) {
          const emptyPot = h('button', {
            type: 'button',
            class: 'flower-pot flower-pot--empty',
            'aria-label': 'Maceta vacía (escuchar en inglés)',
            onclick: (e: MouseEvent) => {
              playSfx('pop');
              speakEnglish('missing', { anchor: e.currentTarget as HTMLElement, mode: 'click' });
            },
          }, h('span', { 'aria-hidden': 'true' }, '🕳️'), h('strong', {}, '❔'));
          return addHoverVoice(emptyPot, 'missing');
        }
        const shown = value === null ? puzzle.answer : value;
        const icon = solved ? FLOWERS[index % FLOWERS.length] : STAGES[Math.min(i, STAGES.length - 1)];
        const pot = h('button', {
          type: 'button',
          class: `flower-pot ${value === null && solved ? 'flower-pot--bloomed' : ''}`.trim(),
          'aria-label': `Maceta ${shown} (escuchar en inglés)`,
          onclick: (e: MouseEvent) => {
            playSfx('pop');
            speakEnglish(String(shown), { anchor: e.currentTarget as HTMLElement, mode: 'click' });
          },
        }, h('span', { 'aria-hidden': 'true' }, icon), h('strong', {}, String(shown)));
        return addHoverVoice(pot, String(shown));
      });

      append(wrap, [
        CharacterBubble({
          emoji: '🐝',
          mood: solved ? FLOWERS[index % FLOWERS.length] : undefined,
          name: 'Abeja Maya',
          englishName: 'Maya the bee',
          text: puzzle.instruction.es,
          englishText: puzzle.instruction.en,
        }),
        Panel('🪴 Planta el paquete de semillas correcto', [
          h('div', { class: 'flower-sequence', 'aria-label': `Secuencia: ${seqLabel}` }, ...pots),
          h('div', { class: 'number-choices' }, ...puzzle.choices.map((value) => {
            const wrongBadge = triedWrong.get(value);
            return Button(`${wrongBadge ?? '🌱'} ${value}`, {
              variant: wrongBadge ? 'ghost' : 'secondary',
              className: 'number-choice',
              disabled: solved || Boolean(wrongBadge),
              focusKey: `choice-${value}`,
              ariaLabel: `Plantar ${value}`,
              voiceHover: String(value),
              onClick: (e) => choose(value, e.currentTarget as HTMLElement),
            });
          })),
        ]),
        StatusBanner(message),
        solved
          ? Button('Siguiente macizo →', {
              onClick: next,
              large: true,
              focusKey: 'next-pattern',
              voiceHover: 'Next flower bed',
            })
          : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
};
