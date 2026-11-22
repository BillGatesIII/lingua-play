import { diagnosePatternMistake } from '../../shared/coach';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { createGameDirector } from '../../shared/speechDirector';
import { updateProgress } from '../../shared/storage';
import { speakEnglish } from '../../shared/voice';
import type { Page } from '../../pages/types';
import { Button, Panel, SpeakButton } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  FLOWERS, GARDEN_LENGTH, gardenMistake, generatePattern, isPatternSolved, type PatternPuzzle,
} from './logic';

const STAGES = ['🌱', '🌿', '🌷', '🌻'] as const;

export const gardenPage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x369dea0f) >>> 0);
  const director = createGameDirector(rng);
  let index = 0;
  let puzzle: PatternPuzzle = generatePattern(rng, index);
  let triedWrong = new Map<number, string>();
  let solved = false;
  let closed = false;
  let message: string | null = null;
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
      speakEnglish(director.celebrate(director.pickLine('bloom', [
        `${value}! The garden bloomed!`,
        `${value}! Look at those flowers!`,
        `${value}! What a lovely bloom!`,
      ])), { anchor, mode: 'event' });
      message = `¡Floreció el jardín! ${bloom} ¡La secuencia está completa!`;
    } else {
      const oops = gardenMistake(rng);
      triedWrong = new Map(triedWrong).set(value, oops.badge);
      playSfx('oops');
      const advice = diagnosePatternMistake(puzzle, value);
      speakEnglish(director.encourage(advice.hint, advice.first), { anchor, mode: 'event' });
      message = oops.text.es;
    }
    draw(solved ? 'next-pattern' : undefined);
  }

  function next() {
    index++;
    director.nextPuzzle();
    if (index >= GARDEN_LENGTH) {
      closed = true;
      completeGameRound();
      playSfx('levelUp');
      speakEnglish(director.pickLine('garden-end', [
        'What a lovely garden!',
        'Splendid gardening! The bees are thrilled!',
        'Marvellous flowers! Every bed is blooming!',
        'Brilliant! A garden full of colour!',
      ]), { mode: 'event' });
    } else {
      puzzle = generatePattern(rng, index);
      triedWrong = new Map();
      solved = false;
      playSfx('step');
      const intro = director.transition('next-bed', [
        'Next flower bed!',
        'Let us plant another row!',
        'Ready for more seeds!',
      ], 2);
      if (intro) speakEnglish(intro, { mode: 'event' });
    }
    message = null;
    draw(closed ? 'play-again' : `choice-${puzzle.choices[0]}`);
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🌷 Bloom Garden',
        noun: 'Macizo',
        index, total: GARDEN_LENGTH,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'leaf',
          title: '¡Qué jardín tan bonito! 🌼',
          art: h('p', { class: 'big-emoji', 'aria-label': 'flores' }, flowers.join(' ')),
          body: 'Las abejas y las flores te dan las gracias. ¡Vuelve cuando quieras!',
          againLabel: 'Otra vez',
          againVoice: 'Play again',
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
          return SpeakButton([h('span', { 'aria-hidden': 'true' }, '🕳️'), h('strong', {}, '❔')], {
            english: 'missing',
            className: 'flower-pot flower-pot--empty',
            ariaLabel: 'Maceta vacía (escuchar en inglés)',
          });
        }
        const shown = value === null ? puzzle.answer : value;
        const icon = solved ? FLOWERS[index % FLOWERS.length] : STAGES[Math.min(i, STAGES.length - 1)];
        return SpeakButton([h('span', { 'aria-hidden': 'true' }, icon), h('strong', {}, String(shown))], {
          english: String(shown),
          className: `flower-pot ${value === null && solved ? 'flower-pot--bloomed' : ''}`.trim(),
          ariaLabel: `Maceta ${shown} (escuchar en inglés)`,
        });
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
              voiceRole: 'vocab',
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
