import { diagnoseColorMistake, scaffoldVocab } from '../../shared/coach';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32, randInt, shuffle } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { createGameDirector } from '../../shared/speechDirector';
import { updateProgress } from '../../shared/storage';
import { addHoverVoice, cancelPendingHover, speakEnglish } from '../../shared/voice';
import type { Page } from '../../pages/types';
import { Button, Panel, SpeakButton } from '../../ui/components';
import { append, h, svg } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  BRUSH_RADIUS, ZONES_TO_COMPLETE, buildChameleonSvg, coveredPaintZones, type BrushPoint,
} from './chameleonSvg';
import {
  CHAMELEONS, COLORS, MAX_POTS, POTS, ROUND_LENGTH, generateRound, mix, mixFeedback,
  playfulClue, recipePotCount, togglePot, type ColorId, type PotId,
} from './logic';

export const colorsPage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x27d4eb2f) >>> 0);
  const director = createGameDirector(rng);
  const pals = shuffle(rng, CHAMELEONS);
  let round = generateRound(rng);
  let index = 0;
  let clueVariant = randInt(rng, 0, 11);
  let forceSimile = false;
  let bowl: PotId[] = [];
  let paintedColor: ColorId | null = null;
  let brushStrokes: BrushPoint[] = [];
  let poursOnCurrent = 0;
  let paintAttempts = 0;
  let mixNote: string | null = null;
  let solved = false;
  let closed = false;

  const host = h('div', { class: 'world world--colors' });
  ctx.root.append(host);

  const target = (): ColorId => round[index];
  const mixed = (): ColorId | null => mix(bowl);

  function pour(pot: PotId, anchor?: HTMLElement) {
    if (solved || closed) return;
    const removing = bowl.includes(pot);
    bowl = togglePot(bowl, pot, MAX_POTS);
    if (!removing) poursOnCurrent += 1;
    brushStrokes = [];
    const m = mixed();
    playSfx('splash');
    mixNote = null;
    if (!removing && m && m !== target() && poursOnCurrent >= 4 && poursOnCurrent % 2 === 0) {
      const advice = diagnoseColorMistake(target(), bowl);
      speakEnglish(advice.hint, { anchor, mode: 'event' });
    } else {
      const colorName = m ? COLORS[m].name.en : 'empty';
      const label = m ? scaffoldVocab(colorName, 'color', rng, colorName) : 'empty';
      speakEnglish(label, {
        anchor,
        mode: 'click',
        role: 'step',
        topic: m ? label : 'color-empty',
        coalesceKey: 'colors-bowl',
      });
    }
    draw();
  }

  function applyPaint(anchor?: HTMLElement) {
    if (solved || closed) return;
    const m = mixed();
    if (!m) return;
    paintedColor = m;
    brushStrokes = [];
    paintAttempts += 1;
    if (m === target()) {
      solved = true;
      poursOnCurrent = 0;
      paintAttempts = 0;
      const emoji = COLORS[target()].emoji;
      updateProgress((p) => {
        p.colors.painted += 1;
        if (!p.colors.colours.includes(emoji)) p.colors.colours.push(emoji);
      });
      playSfx('surprise');
      mixNote = null;
      speakEnglish(director.celebrate(COLORS[m].name.en), { anchor, mode: 'event' });
    } else if (m === 'mud') {
      playSfx('splash');
      mixNote = mixFeedback(m, rng).es;
      const advice = diagnoseColorMistake(target(), bowl);
      const line = director.encourage(
        advice.hint,
        director.pickLine('mud', [
          'Muddy brown! Looks like a puddle!',
          'Splodge! That turned muddy brown!',
          'Oops, muddy brown! Too many paints!',
        ]),
      );
      speakEnglish(line, { anchor, mode: 'event' });
    } else {
      playSfx('splash');
      mixNote = mixFeedback(m, rng).es;
      const advice = diagnoseColorMistake(target(), bowl);
      if (paintAttempts >= 2) {
        speakEnglish(director.encourage(advice.hint, `${COLORS[m].name.en}! Not quite yet!`), {
          anchor,
          mode: 'event',
        });
      } else {
        const colorName = COLORS[m].name.en;
        const label = scaffoldVocab(colorName, 'color', rng, colorName);
        speakEnglish(label, { anchor, mode: 'event' });
      }
    }
    draw(solved ? 'next-chameleon' : undefined);
  }

  function next() {
    index++;
    bowl = [];
    paintedColor = null;
    brushStrokes = [];
    poursOnCurrent = 0;
    paintAttempts = 0;
    mixNote = null;
    solved = false;
    clueVariant = randInt(rng, 0, 11);
    forceSimile = director.streak >= 2;
    director.nextPuzzle();
    if (index >= ROUND_LENGTH) {
      closed = true;
      completeGameRound();
      playSfx('levelUp');
      speakEnglish(director.pickLine('gallery', [
        'What a colourful gallery!',
        'Splendid painting! Look at all those chameleons!',
        'Marvellous colours! True artist!',
        'Brilliant gallery! Every chameleon looks smashing!',
      ]), { mode: 'event' });
    } else {
      playSfx('step');
      const pal = pals[index % pals.length].name.en;
      const intro = director.transition('next-pal', [
        pal,
        `Say hello to ${pal}!`,
        `Next up: ${pal}!`,
      ], 2);
      if (intro) speakEnglish(intro, { mode: 'event' });
    }
    draw(closed ? 'play-again' : `pot-${POTS[0]}`);
  }

  function status(): string {
    const m = mixed();
    if (solved && paintedColor) return `¡Sí! ¡Qué ${COLORS[paintedColor].name.es}! 🎉`;
    if (mixNote) return mixNote;
    const needed = recipePotCount(target());
    if (!m) {
      return needed === 1
        ? '1. Elige un bote de pintura y luego pinta al camaleón con el pincel.'
        : `1. Mezcla ${needed} botes de pintura en el cuenco y luego pinta al camaleón.`;
    }
    if (bowl.length < needed) {
      return `En el cuenco hay ${COLORS[m].name.es}. Puedes añadir otro color (${bowl.length}/${needed}) o pintar al camaleón.`;
    }
    return `¡Pincel cargado de ${COLORS[m].name.es}! 🖌️ Pasa el pincel por el camaleón (o tócalo) para pintarlo.`;
  }

  function toSvgPoint(svgEl: SVGSVGElement, clientX: number, clientY: number): BrushPoint {
    const rect = svgEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 130, y: 100 };
    return {
      x: ((clientX - rect.left) / rect.width) * 260,
      y: ((clientY - rect.top) / rect.height) * 200,
    };
  }

  function galleryChameleon(color: ColorId): HTMLElement {
    const { svgEl } = buildChameleonSvg({
      baseColor: color,
      baseHex: COLORS[color].hex,
      mood: 'happy',
      compact: true,
    });
    return SpeakButton(svgEl, {
      english: COLORS[color].name.en,
      className: 'chameleon-gallery-btn',
      ariaLabel: `${COLORS[color].name.es} (escuchar en inglés)`,
    });
  }

  function interactiveChameleon(): HTMLElement {
    const m = mixed();
    const canPaint = Boolean(m && !solved && !closed);
    const mood: 'idle' | 'happy' | 'mud' = solved
      ? 'happy'
      : paintedColor === 'mud'
        ? 'mud'
        : 'idle';

    const { svgEl, maskStrokesEl, brushCursorEl } = buildChameleonSvg({
      baseColor: paintedColor,
      baseHex: paintedColor ? COLORS[paintedColor].hex : '#f8f5ee',
      brushColor: canPaint ? m : null,
      brushHex: canPaint && m ? COLORS[m].hex : null,
      strokes: brushStrokes,
      mood,
      inviting: canPaint && m !== paintedColor,
    });

    const colorLabel = paintedColor ? COLORS[paintedColor].name.es : 'sin pintar';
    const ariaLabel = canPaint && m
      ? `Camaleón (${colorLabel}): arrastra o toca para pintar de ${COLORS[m].name.es}`
      : `Camaleón (${colorLabel}): escuchar en inglés`;

    const canvas = h('div', {
      class: [
        'chameleon-canvas',
        canPaint ? 'chameleon-canvas--ready' : '',
        solved ? 'chameleon-canvas--happy' : '',
      ].filter(Boolean).join(' '),
      role: 'button',
      tabindex: 0,
      'data-focus': 'chameleon-canvas',
      'aria-label': ariaLabel,
      onkeydown: (e: KeyboardEvent) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (canPaint) {
          applyPaint(canvas);
        } else {
          playSfx('pop');
          speakEnglish(paintedColor ? COLORS[paintedColor].name.en : 'unpainted', {
            anchor: canvas,
            mode: 'click',
          });
        }
      },
    }, svgEl);

    if (!canPaint) {
      const english = paintedColor ? COLORS[paintedColor].name.en : 'unpainted';
      canvas.addEventListener('click', () => {
        playSfx('pop');
        speakEnglish(english, { anchor: canvas, mode: 'click' });
      });
      addHoverVoice(canvas, english, { role: 'vocab' });
      return canvas;
    }

    let painting = false;
    let movedDist = 0;
    let lastPt: BrushPoint | null = null;
    let activePointerId: number | null = null;
    let completedThisStroke = false;

    const moveBrushCursor = (pt: BrushPoint | null) => {
      if (!brushCursorEl) return;
      if (!pt) {
        brushCursorEl.setAttribute('opacity', '0');
        return;
      }
      brushCursorEl.setAttribute('transform', `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);
      brushCursorEl.setAttribute('opacity', '1');
    };

    const addDab = (pt: BrushPoint) => {
      if (completedThisStroke) return;
      brushStrokes.push(pt);
      if (maskStrokesEl) {
        maskStrokesEl.append(svg('circle', {
          cx: pt.x.toFixed(1),
          cy: pt.y.toFixed(1),
          r: BRUSH_RADIUS,
          fill: '#ffffff',
        }));
      }
      if (coveredPaintZones(brushStrokes).size >= ZONES_TO_COMPLETE) {
        completedThisStroke = true;
        painting = false;
        applyPaint(canvas);
      }
    };

    canvas.addEventListener('pointerenter', (e: PointerEvent) => {
      if (e.pointerType !== 'touch') moveBrushCursor(toSvgPoint(svgEl, e.clientX, e.clientY));
    });

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (painting) return;
      e.preventDefault();
      cancelPendingHover();
      painting = true;
      completedThisStroke = false;
      movedDist = 0;
      activePointerId = e.pointerId;
      try {
        canvas.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore in jsdom */
      }
      const pt = toSvgPoint(svgEl, e.clientX, e.clientY);
      lastPt = pt;
      moveBrushCursor(e.pointerType === 'touch' ? null : pt);
      playSfx('pop');
      addDab(pt);
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (painting && activePointerId !== null && e.pointerId !== activePointerId) return;
      const pt = toSvgPoint(svgEl, e.clientX, e.clientY);
      if (e.pointerType !== 'touch') moveBrushCursor(pt);
      if (!painting || completedThisStroke) return;
      if (lastPt) {
        const stepDist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
        if (stepDist < 7) return;
        movedDist += stepDist;
        const steps = Math.max(1, Math.ceil(stepDist / 14));
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          addDab({
            x: lastPt.x + (pt.x - lastPt.x) * t,
            y: lastPt.y + (pt.y - lastPt.y) * t,
          });
          if (completedThisStroke) break;
        }
        lastPt = pt;
        return;
      }
      lastPt = pt;
      addDab(pt);
    });

    const finishStroke = (e: PointerEvent, cancelled = false) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      try {
        if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      activePointerId = null;
      if (e.pointerType === 'touch') moveBrushCursor(null);
      if (!painting) return;
      painting = false;
      if (cancelled || completedThisStroke) return;
      // A quick click/tap paints the whole chameleon in one splash for effortless play
      if (movedDist < 12) {
        applyPaint(canvas);
      }
    };

    canvas.addEventListener('pointerup', (e: PointerEvent) => finishStroke(e, false));
    canvas.addEventListener('pointercancel', (e: PointerEvent) => finishStroke(e, true));
    canvas.addEventListener('pointerleave', () => {
      if (!painting) moveBrushCursor(null);
    });

    return canvas;
  }

  function mixRecipeBar(): HTMLElement {
    const needed = recipePotCount(target());
    const slotCount = Math.max(needed, bowl.length);
    const m = mixed();
    const parts: (HTMLElement | string)[] = [];

    for (let i = 0; i < slotCount; i++) {
      if (i > 0) parts.push(h('span', { class: 'mix-op', 'aria-hidden': 'true' }, '+'));
      const pot = bowl[i];
      if (pot) {
        parts.push(h('span', {
          class: 'mix-drop mix-drop--filled',
          title: COLORS[pot].name.es,
          style: `--paint:${COLORS[pot].hex}`,
          'aria-hidden': 'true',
        }));
      } else {
        parts.push(h('span', { class: 'mix-drop mix-drop--empty', 'aria-hidden': 'true' }, '?'));
      }
    }

    parts.push(h('span', { class: 'mix-op', 'aria-hidden': 'true' }, '='));
    parts.push(
      m
        ? h('span', {
            class: 'mix-result mix-result--ready',
            style: `--paint:${COLORS[m].hex}`,
          }, h('span', { class: 'mix-result__brush', 'aria-hidden': 'true' }, '🖌️'))
        : h('span', { class: 'mix-result mix-result--empty', 'aria-hidden': 'true' }, '🖌️'),
    );

    const bowlNames = bowl.map((p) => COLORS[p].name.es).join(' + ') || 'vacío';
    const countLabel = bowl.length > needed ? `${bowl.length} colores` : `${bowl.length} de ${needed} colores`;
    const resultLabel = m ? ` = ${COLORS[m].name.es}` : '';
    return h('div', {
      class: 'mix-recipe',
      role: 'img',
      'aria-label': `Mezcla (${countLabel}): ${bowlNames}${resultLabel}`,
    }, ...parts);
  }

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
        voiceRole: 'vocab',
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
              galleryChameleon(c),
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

      const pal = pals[index % pals.length];
      const needed = recipePotCount(target());
      const m = mixed();
      const panelTitle = needed === 1
        ? '🎨 1. Elige 1 color'
        : `🎨 1. Mezcla ${needed} colores`;

      append(wrap, [
        CharacterBubble({
          emoji: pal.emoji,
          mood: solved ? '✨' : undefined,
          name: pal.name.es,
          englishName: pal.name.en,
          text: playfulClue(target(), index, 'es', clueVariant, forceSimile),
          englishText: playfulClue(target(), index, 'en', clueVariant, forceSimile),
        }),
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'stage' },
            interactiveChameleon(),
            mixRecipeBar(),
            !solved && m
              ? h('p', { class: 'brush-cue' }, '🖌️ 2. Pasa el pincel por el camaleón (o tócalo)')
              : h('p', { class: 'muted brush-cue--muted' },
                  solved
                    ? '✨ ¡Qué bien pintado!'
                    : needed === 1
                      ? 'Toca un bote para mojar el pincel.'
                      : `Toca ${needed} botes para mezclar en el cuenco.`)),
          Panel(panelTitle, [
            pots(),
            h('div', { class: 'row' },
              Button('Vaciar el cuenco', {
                variant: 'ghost',
                disabled: solved || bowl.length === 0,
                focusKey: 'empty',
                voiceHover: 'Empty the bowl',
                onClick: () => {
                  playSfx('remove');
                  bowl = [];
                  brushStrokes = [];
                  mixNote = null;
                  poursOnCurrent = Math.min(poursOnCurrent, 2);
                  draw(`pot-${POTS[0]}`);
                },
              })),
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
