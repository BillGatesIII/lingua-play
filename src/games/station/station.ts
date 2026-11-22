import { diagnoseClockMistake, scaffoldVocab } from '../../shared/coach';
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
  TRAINS_PER_ROUND, TRAVELLERS, checkClock, generateTrain, sameTime, stepClock, timeText,
  trainSpeech, type ClockTime, type TrainChallenge,
} from './logic';

export const stationPage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x94d049bb) >>> 0);
  const director = createGameDirector(rng);
  const travellers = shuffle(rng, TRAVELLERS);
  let index = 0;
  let challenge: TrainChallenge = generateTrain(rng, index);
  let clock: ClockTime = pickStartClock(challenge);
  let solved = false;
  let closed = false;
  let message: string | null = null;
  const stamps: string[] = [];

  const host = h('div', { class: 'world world--station' });
  ctx.root.append(host);

  function pickStartClock(c: TrainChallenge): ClockTime {
    const start = { hour: 12, minute: 0 };
    return sameTime(start, c.target) ? { hour: 6, minute: 0 } : start;
  }

  const say = (m: string | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function adjust(delta: number, anchor?: HTMLElement) {
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
    const err = checkClock(challenge.target, clock);
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
    say(`¡En punto! 🎫 El tren parte rumbo a ${challenge.destination.name.es} ${stamp}`, 'next-train');
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
      challenge = generateTrain(rng, index);
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
    draw(closed ? 'another-shift' : 'ctrl-p60');
  }

  function analogClock(): SVGSVGElement {
    const cx = 100;
    const cy = 100;
    const minAngle = (clock.minute * 6 - 90) * (Math.PI / 180);
    const hourAngle = (((clock.hour % 12) + clock.minute / 60) * 30 - 90) * (Math.PI / 180);

    const marks: SVGElement[] = [];
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * (Math.PI / 180);
      const major = i % 5 === 0;
      const r1 = major ? 76 : 82;
      const r2 = 88;
      marks.push(svg('line', {
        x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1,
        x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2,
        stroke: '#1f1b3d', 'stroke-width': major ? 3 : 1.5, 'stroke-linecap': 'round',
      }));
    }
    for (let hNum = 1; hNum <= 12; hNum++) {
      const a = (hNum * 30 - 90) * (Math.PI / 180);
      marks.push(svg('text', {
        x: cx + Math.cos(a) * 62, y: cy + Math.sin(a) * 62 + 5,
        'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, fill: '#1f1b3d',
      }, String(hNum)));
    }

    return svg('svg', { class: 'clock-svg', viewBox: '0 0 200 200', 'aria-hidden': 'true' },
      svg('circle', { cx, cy, r: 94, fill: '#fffaf0', stroke: '#1f1b3d', 'stroke-width': 6 }),
      ...marks,
      svg('line', {
        x1: cx, y1: cy,
        x2: cx + Math.cos(hourAngle) * 44, y2: cy + Math.sin(hourAngle) * 44,
        stroke: '#ff6b6b', 'stroke-width': 8, 'stroke-linecap': 'round',
      }),
      svg('line', {
        x1: cx, y1: cy,
        x2: cx + Math.cos(minAngle) * 68, y2: cy + Math.sin(minAngle) * 68,
        stroke: '#1f1b3d', 'stroke-width': 5, 'stroke-linecap': 'round',
      }),
      svg('circle', { cx, cy, r: 7, fill: '#ffd23f', stroke: '#1f1b3d', 'stroke-width': 3 }),
    );
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
      const pad = (n: number) => String(n).padStart(2, '0');
      const clockLabel = `Reloj de la estación: ${clock.hour}:${pad(clock.minute)}`;
      const clockEnglish = timeText(clock, 'en');
      const controls: [string, number, string, string][] = [
        ['− 1 h', -60, 'ctrl-m60', 'minus one hour'],
        ['+ 1 h', 60, 'ctrl-p60', 'plus one hour'],
        ['− 15 min', -15, 'ctrl-m15', 'minus fifteen minutes'],
        ['+ 15 min', 15, 'ctrl-p15', 'plus fifteen minutes'],
        ['− 5 min', -5, 'ctrl-m5', 'minus five minutes'],
        ['+ 5 min', 5, 'ctrl-p5', 'plus five minutes'],
      ];

      const destEn = challenge.destination.name.en;
      const ticket = SpeakButton(`${challenge.destination.emoji} ${challenge.destination.name.es}`, {
        english: () => scaffoldVocab(destEn, 'destination', rng, destEn),
        hoverText: destEn,
        topic: destEn,
        className: 'ticket-card ticket-card--btn',
        ariaLabel: `Destino: ${challenge.destination.name.es} (escuchar en inglés)`,
      });

      const clockBtn = SpeakButton(analogClock(), {
        english: clockEnglish,
        className: 'clock-btn',
        ariaLabel: `${clockLabel} (escuchar la hora en inglés)`,
        sfx: 'tick',
      });

      append(wrap, [
        CharacterBubble({
          emoji: traveller.emoji,
          mood: solved ? '🎫' : undefined,
          name: traveller.name.es,
          englishName: traveller.name.en,
          text: trainSpeech(challenge, 'es'),
          englishText: trainSpeech(challenge, 'en'),
          extra: ticket,
        }),
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'station-stage', role: 'group', 'aria-label': clockLabel },
            clockBtn,
            h('p', { class: 'muted' }, 'Aguja roja = horas · Aguja negra = minutos')),
          Panel('🕒 Ajustar el reloj', [
            h('div', { class: 'clock-controls' }, ...controls.map(([label, delta, fk, voiceEn]) =>
              Button(label, {
                variant: delta > 0 ? 'secondary' : 'ghost',
                disabled: solved,
                focusKey: fk,
                ariaLabel: `${label} (${clockLabel})`,
                voiceHover: voiceEn,
                onClick: (e) => adjust(delta, e.currentTarget as HTMLElement),
              }))),
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
