import { diagnoseClockMistake, scaffoldVocab } from '../../shared/coach';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32, shuffle } from '../../shared/rng';
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
  DESTINATIONS, TRAINS_PER_ROUND, TRAVELLERS, checkClock, dragHourHand, dragMinuteHand,
  generateTrain, pickStartClock, pointerToClockAngle, sameTime, stepClock, timeText,
  toDestinationEs, trainSpeech, type ClockTime, type TrainChallenge,
} from './logic';

type HandKind = 'hour' | 'minute';

export const stationPage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x94d049bb) >>> 0);
  const director = createGameDirector(rng);
  const travellers = shuffle(rng, TRAVELLERS);
  const shiftDestinations = shuffle(rng, DESTINATIONS).slice(0, TRAINS_PER_ROUND);
  let index = 0;
  let challenge: TrainChallenge = generateTrain(rng, index, shiftDestinations[index]);
  let clock: ClockTime = pickStartClock(challenge);
  let solved = false;
  let closed = false;
  let message: string | null = null;
  const stamps: string[] = [];

  const host = h('div', { class: 'world world--station' });
  ctx.root.append(host);

  const say = (m: string | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function adjustByDelta(delta: number, anchor?: HTMLElement) {
    if (solved || closed) return;
    clock = stepClock(clock, delta);
    playSfx('tick');
    speakEnglish(timeText(clock, 'en'), {
      anchor,
      mode: 'click',
      role: 'step',
      topic: `station-${clock.hour}-${clock.minute}`,
      coalesceKey: 'station-clock',
    });
    say(null);
  }

  function dispatch(anchor?: HTMLElement) {
    if (solved || closed) return;
    const err = checkClock(challenge.target, clock, rng);
    if (err) {
      playSfx('oops');
      const early = err.en.includes('early');
      const advice = diagnoseClockMistake(challenge, clock);
      const firstLine = advice?.first ?? (early
        ? director.pickLine('too-early', ['Too early!', 'A bit too early — push the clock forward!', 'Not quite time yet!'])
        : director.pickLine('too-late', ['Too late!', 'A little too late — turn the clock back!', 'Oops, the train would have left!']));
      const hint = advice?.hint ?? (early
        ? 'Move the hands forward. Red is the hour, black is the minutes!'
        : 'Move the hands back. Red is the hour, black is the minutes!');
      speakEnglish(director.encourage(hint, firstLine), { anchor, mode: 'event' });
      return say(err.es, 'dispatch');
    }
    solved = true;
    const stamp = challenge.destination.emoji;
    stamps.push(stamp);
    updateProgress((p) => {
      p.station.dispatched += 1;
      if (!p.station.stamps.includes(stamp)) p.station.stamps.push(stamp);
    });
    playSfx('surprise');
    speakEnglish(director.celebrate(director.pickLine('departed', [
      `All aboard for ${challenge.destination.name.en}!`,
      `Right on time! Off to ${challenge.destination.name.en}!`,
      `Next stop, ${challenge.destination.name.en}!`,
    ])), { anchor, mode: 'event' });
    say(`¡En punto! 🎫 El tren parte rumbo ${toDestinationEs(challenge.destination.name.es)} ${stamp}`, 'next-train');
  }

  function nextTrain() {
    index++;
    director.nextPuzzle();
    if (index >= TRAINS_PER_ROUND) {
      closed = true;
      completeGameRound();
      playSfx('levelUp');
      speakEnglish(director.pickLine('station-end', [
        'All trains departed! Great job!',
        'Splendid stationmaster! Every train left on time!',
        'Brilliant shift! The platform is all clear!',
        'Marvellous timing! See you next shift!',
      ]), { mode: 'event' });
    } else {
      challenge = generateTrain(rng, index, shiftDestinations[index]);
      clock = pickStartClock(challenge);
      solved = false;
      playSfx('step');
      const name = travellers[index % travellers.length].name.en;
      const intro = director.transition('next-traveller', [
        name,
        `Next passenger: ${name}!`,
        `All aboard! Here comes ${name}!`,
      ], 2);
      if (intro) speakEnglish(intro, { mode: 'event' });
    }
    message = null;
    draw(closed ? 'another-shift' : 'station-clock');
  }

  function interactiveClock(): HTMLElement {
    const cx = 120;
    const cy = 120;
    const hourLen = 50;
    const minLen = 78;
    const pad = (n: number) => String(n).padStart(2, '0');
    const clockAria = () => `Reloj de la estación: ${clock.hour}:${pad(clock.minute)}. Arrastra las agujas o usa las flechas.`;

    const marks: SVGElement[] = [];
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * (Math.PI / 180);
      const major = i % 5 === 0;
      const r1 = major ? 92 : 98;
      const r2 = 105;
      marks.push(svg('line', {
        x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1,
        x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2,
        stroke: '#1f1b3d', 'stroke-width': major ? 3.5 : 1.5, 'stroke-linecap': 'round',
      }));
    }
    for (let hNum = 1; hNum <= 12; hNum++) {
      const a = (hNum * 30 - 90) * (Math.PI / 180);
      marks.push(svg('text', {
        x: cx + Math.cos(a) * 76, y: cy + Math.sin(a) * 76 + 6,
        'text-anchor': 'middle', 'font-size': 17, 'font-weight': 900, fill: '#1f1b3d',
        class: 'clock-num',
      }, String(hNum)));
    }

    const hourHit = svg('line', {
      x1: cx, y1: cy, x2: cx, y2: cy - hourLen,
      stroke: 'transparent', 'stroke-width': 26, 'stroke-linecap': 'round',
      class: 'clock-hand-hit', 'data-hand': 'hour',
    });
    const hourLine = svg('line', {
      x1: cx, y1: cy, x2: cx, y2: cy - hourLen,
      stroke: '#ff6b6b', 'stroke-width': 9, 'stroke-linecap': 'round',
      class: 'clock-hand clock-hand--hour', 'data-hand': 'hour',
    });
    const hourKnob = svg('circle', {
      cx, cy: cy - hourLen, r: 10,
      fill: '#ff6b6b', stroke: '#1f1b3d', 'stroke-width': 3,
      class: 'clock-knob clock-knob--hour', 'data-hand': 'hour',
    });
    const hourDot = svg('circle', {
      cx, cy: cy - hourLen, r: 3.2,
      fill: '#ffffff', 'pointer-events': 'none',
    });

    const minHit = svg('line', {
      x1: cx, y1: cy, x2: cx, y2: cy - minLen,
      stroke: 'transparent', 'stroke-width': 24, 'stroke-linecap': 'round',
      class: 'clock-hand-hit', 'data-hand': 'minute',
    });
    const minLine = svg('line', {
      x1: cx, y1: cy, x2: cx, y2: cy - minLen,
      stroke: '#1f1b3d', 'stroke-width': 5.5, 'stroke-linecap': 'round',
      class: 'clock-hand clock-hand--minute', 'data-hand': 'minute',
    });
    const minKnob = svg('circle', {
      cx, cy: cy - minLen, r: 9.5,
      fill: '#ffd23f', stroke: '#1f1b3d', 'stroke-width': 3,
      class: 'clock-knob clock-knob--minute', 'data-hand': 'minute',
    });
    const minDot = svg('circle', {
      cx, cy: cy - minLen, r: 3,
      fill: '#1f1b3d', 'pointer-events': 'none',
    });

    const hourGroup = svg('g', { class: 'clock-hand-group', 'data-hand': 'hour' },
      hourHit, hourLine, hourKnob, hourDot);
    const minGroup = svg('g', { class: 'clock-hand-group', 'data-hand': 'minute' },
      minHit, minLine, minKnob, minDot);

    const clockSvg = svg('svg', {
      class: solved ? 'clock-svg clock-svg--locked' : 'clock-svg clock-svg--draggable',
      viewBox: '0 0 240 240',
      'aria-hidden': 'true',
    },
    svg('circle', { cx, cy, r: 112, fill: '#fffaf0', stroke: '#1f1b3d', 'stroke-width': 6.5 }),
    ...marks,
    minGroup,
    hourGroup,
    svg('circle', { cx, cy, r: 8.5, fill: '#ffd23f', stroke: '#1f1b3d', 'stroke-width': 3 }),
    );

    const updateHandCoords = () => {
      const minAngle = (clock.minute * 6 - 90) * (Math.PI / 180);
      const hourAngle = (((clock.hour % 12) + clock.minute / 60) * 30 - 90) * (Math.PI / 180);
      const hx = cx + Math.cos(hourAngle) * hourLen;
      const hy = cy + Math.sin(hourAngle) * hourLen;
      const mx = cx + Math.cos(minAngle) * minLen;
      const my = cy + Math.sin(minAngle) * minLen;

      for (const el of [hourHit, hourLine]) {
        el.setAttribute('x2', hx.toFixed(1));
        el.setAttribute('y2', hy.toFixed(1));
      }
      for (const el of [hourKnob, hourDot]) {
        el.setAttribute('cx', hx.toFixed(1));
        el.setAttribute('cy', hy.toFixed(1));
      }
      for (const el of [minHit, minLine]) {
        el.setAttribute('x2', mx.toFixed(1));
        el.setAttribute('y2', my.toFixed(1));
      }
      for (const el of [minKnob, minDot]) {
        el.setAttribute('cx', mx.toFixed(1));
        el.setAttribute('cy', my.toFixed(1));
      }
    };
    updateHandCoords();

    const wrapper = h('div', {
      class: solved ? 'clock-wrap clock-wrap--locked' : 'clock-wrap',
      role: 'group',
      tabindex: 0,
      'data-focus': 'station-clock',
      'aria-label': clockAria(),
      onkeydown: (e: KeyboardEvent) => {
        if (closed) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playSfx('tick');
          speakEnglish(timeText(clock, 'en'), { anchor: wrapper, mode: 'click' });
          return;
        }
        if (solved) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          adjustByDelta(e.shiftKey ? 60 : 5, wrapper);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          adjustByDelta(e.shiftKey ? -60 : -5, wrapper);
        } else if (e.key === 'PageUp') {
          e.preventDefault();
          adjustByDelta(60, wrapper);
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          adjustByDelta(-60, wrapper);
        }
      },
    }, clockSvg);

    let dragging: HandKind | null = null;
    let activePointerId: number | null = null;
    let movedDuringDrag = false;
    let startClock = { ...clock };

    addHoverVoice(wrapper, () => (dragging ? '' : timeText(clock, 'en')), {
      delayMs: 380,
      role: 'vocab',
    });

    const pointerToSvg = (e: PointerEvent) => {
      const rect = clockSvg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { x: cx, y: cy - minLen };
      return {
        x: ((e.clientX - rect.left) / rect.width) * 240,
        y: ((e.clientY - rect.top) / rect.height) * 240,
      };
    };

    const pickHand = (e: PointerEvent, pt: { x: number; y: number }): HandKind => {
      const hTipX = Number(hourKnob.getAttribute('cx'));
      const hTipY = Number(hourKnob.getAttribute('cy'));
      const mTipX = Number(minKnob.getAttribute('cx'));
      const mTipY = Number(minKnob.getAttribute('cy'));
      const distHour = Math.hypot(pt.x - hTipX, pt.y - hTipY);
      const distMin = Math.hypot(pt.x - mTipX, pt.y - mTipY);
      if (distHour <= 16 && distHour <= distMin) return 'hour';
      if (distMin <= 16 && distMin < distHour) return 'minute';
      const targetEl = e.target as Element | null;
      const direct = targetEl?.closest?.('[data-hand]')?.getAttribute('data-hand');
      if (direct === 'hour' || direct === 'minute') return direct;
      return distHour < distMin ? 'hour' : 'minute';
    };

    const applyPointerAngle = (hand: HandKind, pt: { x: number; y: number }) => {
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      if (Math.hypot(dx, dy) < 10) return;
      const deg = pointerToClockAngle(dx, dy);
      const next = hand === 'hour' ? dragHourHand(clock, deg) : dragMinuteHand(clock, deg);
      if (!sameTime(next, clock)) {
        clock = next;
        movedDuringDrag = true;
        updateHandCoords();
        wrapper.setAttribute('aria-label', clockAria());
        playSfx('tick');
      }
    };

    clockSvg.addEventListener('pointerdown', (e: PointerEvent) => {
      if (closed) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (solved) {
        playSfx('tick');
        speakEnglish(timeText(clock, 'en'), { anchor: wrapper, mode: 'click' });
        return;
      }
      if (dragging) return;
      e.preventDefault();
      cancelPendingHover();
      const pt = pointerToSvg(e);
      dragging = pickHand(e, pt);
      activePointerId = e.pointerId;
      movedDuringDrag = false;
      startClock = { ...clock };
      wrapper.classList.add('clock-wrap--dragging');
      (dragging === 'hour' ? hourGroup : minGroup).classList.add('clock-hand-group--active');
      try {
        clockSvg.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore in jsdom */
      }
      applyPointerAngle(dragging, pt);
    });

    clockSvg.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      applyPointerAngle(dragging, pointerToSvg(e));
    });

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      const endedHand = dragging;
      dragging = null;
      activePointerId = null;
      wrapper.classList.remove('clock-wrap--dragging');
      (endedHand === 'hour' ? hourGroup : minGroup).classList.remove('clock-hand-group--active');
      try {
        if (clockSvg.hasPointerCapture?.(e.pointerId)) clockSvg.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (movedDuringDrag || !sameTime(startClock, clock)) {
        speakEnglish(timeText(clock, 'en'), {
          anchor: wrapper,
          mode: 'click',
          role: 'step',
          topic: `station-${clock.hour}-${clock.minute}`,
          coalesceKey: 'station-clock',
        });
        if (message !== null) {
          say(null, host.contains(document.activeElement) ? 'station-clock' : undefined);
        }
      } else {
        playSfx('tick');
        speakEnglish(timeText(clock, 'en'), { anchor: wrapper, mode: 'click' });
      }
    };

    clockSvg.addEventListener('pointerup', endDrag);
    clockSvg.addEventListener('pointercancel', endDrag);

    return wrapper;
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🚂 Train Station',
        noun: 'Tren',
        index, total: TRAINS_PER_ROUND,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'berry',
          title: '¡Todos los trenes en marcha! 🚂',
          art: h('p', { class: 'big-emoji', 'aria-label': 'sellos' }, stamps.join(' ')),
          body: 'Buen trabajo en la estación central. ¡Vuelve cuando quieras!',
          againLabel: 'Otro turno',
          againVoice: 'Another shift',
          againFocusKey: 'another-shift',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
        }));
        return wrap;
      }

      const traveller = travellers[index % travellers.length];
      const destEn = challenge.destination.name.en;
      const ticket = SpeakButton(`${challenge.destination.emoji} ${challenge.destination.name.es}`, {
        english: () => scaffoldVocab(destEn, 'destination', rng, destEn),
        hoverText: destEn,
        topic: destEn,
        className: 'ticket-card ticket-card--btn',
        ariaLabel: `Destino: ${challenge.destination.name.es} (escuchar en inglés)`,
      });

      const dragHint = challenge.deltaMinutes !== 0
        ? 'El reloj marca la hora original del tren. ¡Arrastra las agujas para calcular la nueva hora!'
        : 'Arrastra los círculos de las agujas para poner la hora.';

      append(wrap, [
        CharacterBubble({
          emoji: traveller.emoji,
          mood: solved ? '🎫' : undefined,
          name: traveller.name.es,
          englishName: traveller.name.en,
          text: trainSpeech(challenge, 'es', index),
          englishText: trainSpeech(challenge, 'en', index),
          extra: ticket,
        }),
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'station-stage' },
            interactiveClock(),
            h('p', { class: 'clock-legend' },
              h('span', { class: 'clock-legend__dot clock-legend__dot--hour', 'aria-hidden': 'true' }),
              ' Horas · ',
              h('span', { class: 'clock-legend__dot clock-legend__dot--min', 'aria-hidden': 'true' }),
              ' Minutos')),
          Panel('🚂 Andén de salida', [
            h('p', { class: 'station-hint' }, dragHint),
            Button('¡Dar salida al tren!', {
              onClick: (e) => dispatch(e.currentTarget as HTMLElement),
              disabled: solved,
              large: true,
              focusKey: 'dispatch',
              voiceHover: 'Dispatch train!',
            }),
          ])),
        StatusBanner(message),
        solved
          ? Button('Siguiente tren →', {
              onClick: nextTrain,
              large: true,
              focusKey: 'next-train',
              voiceHover: 'Next train',
            })
          : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
};
