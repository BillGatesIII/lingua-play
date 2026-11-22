import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { updateProgress } from '../../shared/storage';
import { speakEnglish } from '../../shared/voice';
import type { Page } from '../../pages/types';
import { Button, Panel, SpeakButton } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  CHAMELEONS, COLORS, MAX_POTS, POTS, ROUND_LENGTH, generateRound, mix, mixFeedback,
  playfulClue, togglePot, type ColorId, type PotId,
} from './logic';

export const colorsPage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x27d4eb2f) >>> 0);
  let round = generateRound(rng);
  let index = 0;
  let bowl: PotId[] = [];
  let solved = false;
  let closed = false;

  const host = h('div', { class: 'world world--colors' });
  ctx.root.append(host);

  const target = (): ColorId => round[index];
  const mixed = (): ColorId | null => mix(bowl);

  function pour(pot: PotId, anchor?: HTMLElement) {
    if (solved || closed) return;
    bowl = togglePot(bowl, pot, MAX_POTS);
    const m = mixed();
    if (m === target()) {
      solved = true;
      const emoji = COLORS[target()].emoji;
      updateProgress((p) => {
        p.colors.painted += 1;
        if (!p.colors.colours.includes(emoji)) p.colors.colours.push(emoji);
      });
      playSfx('surprise');
      speakEnglish(`Yes! ${COLORS[m].name.en}!`, { anchor, mode: 'click' });
    } else {
      playSfx('splash');
      speakEnglish(m ? COLORS[m].name.en : 'empty', { anchor, mode: 'click' });
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
      playSfx('levelUp');
      speakEnglish('What a colourful gallery!');
    } else {
      playSfx('step');
      speakEnglish(CHAMELEONS[index % CHAMELEONS.length].name.en);
    }
    draw(closed ? 'play-again' : `pot-${POTS[0]}`);
  }

  function status(): string {
    const m = mixed();
    if (solved && m) return `¡Sí! ¡Qué ${COLORS[m].name.es}! 🎉`;
    if (!m) return 'Toca los botes de pintura para mezclar.';
    return mixFeedback(m, rng).es;
  }

  const chameleon = (color: ColorId | null, label: string, happy = false): HTMLElement =>
    SpeakButton(h('span', { 'aria-hidden': 'true' }, '🦎'), {
      english: color ? COLORS[color].name.en : 'unpainted',
      className: `chameleon chameleon--btn ${happy ? 'chameleon--happy' : ''}`.trim(),
      ariaLabel: `${label} (escuchar en inglés)`,
      style: `--paint:${color ? COLORS[color].hex : '#fffaf0'}`,
    });

  function pots(): HTMLElement {
    return h('div', { class: 'pots' }, ...POTS.map((pot) => {
      const c = COLORS[pot];
      return Button([
        h('span', { class: 'pot__swatch', 'aria-hidden': 'true', style: `--paint:${c.hex}` }),
        h('span', { lang: 'es' }, c.name.es),
      ], {
        variant: 'ghost',
        className: 'pot',
        pressed: bowl.includes(pot),
        disabled: solved,
        focusKey: `pot-${pot}`,
        ariaLabel: c.name.es,
        voiceHover: c.name.en,
        onClick: (e) => pour(pot, e.currentTarget as HTMLElement),
      });
    }));
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🎨 Color Chameleon',
        noun: 'Camaleón',
        index, total: ROUND_LENGTH,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'leaf',
          title: '¡Qué galería tan colorida! 🖼️',
          art: h('div', { class: 'gallery' }, ...round.map((c) =>
            h('figure', { class: 'gallery__item' },
              chameleon(c, COLORS[c].name.es, true),
              h('figcaption', {}, COLORS[c].name.es)))),
          body: 'Los camaleones se van a descansar. ¡Vuelve cuando quieras!',
          againLabel: 'Otra vez',
          againVoice: 'Play again',
          againFocusKey: 'play-again',
          onAgain: () => {
            ctx.refresh();
            ctx.root.querySelector<HTMLElement>('[data-focus^="pot-"]:not(:disabled)')?.focus();
          },
          onBreakChange: () => draw(),
        }));
        return wrap;
      }

      const pal = CHAMELEONS[index % CHAMELEONS.length];
      const shown = mixed();

      append(wrap, [
        CharacterBubble({
          emoji: pal.emoji,
          mood: solved ? '✨' : undefined,
          name: pal.name.es,
          englishName: pal.name.en,
          text: playfulClue(target(), index, 'es'),
          englishText: playfulClue(target(), index, 'en'),
        }),
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'stage' },
            chameleon(shown, shown ? COLORS[shown].name.es : 'sin pintar', solved),
            h('p', {
              class: 'bowl', role: 'img',
              'aria-label': `Cuenco de mezcla: ${bowl.map((p) => COLORS[p].name.es).join(', ') || 'vacío'}`,
            },
            h('span', { 'aria-hidden': 'true' }, '🥣'),
            ...(bowl.length
              ? bowl.map((p) => h('span', { class: 'chip', 'aria-hidden': 'true', style: `--paint:${COLORS[p].hex}` }))
              : [h('span', { class: 'muted' }, '—')]))),
          Panel(`🎨 Pintura (${bowl.length}/${MAX_POTS})`, [
            pots(),
            Button('Vaciar el cuenco', {
              variant: 'ghost',
              disabled: solved || bowl.length === 0,
              focusKey: 'empty',
              voiceHover: 'Empty the bowl',
              onClick: () => {
                playSfx('remove');
                bowl = [];
                draw(`pot-${POTS[0]}`);
              },
            }),
          ])),
        StatusBanner(status(), true),
        solved
          ? Button('Siguiente camaleón →', {
              onClick: next,
              large: true,
              focusKey: 'next-chameleon',
              voiceHover: 'Next chameleon',
            })
          : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
};
