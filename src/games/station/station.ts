import { other, tr, type Bi } from '../../shared/i18n';
import { mulberry32, shuffle } from '../../shared/rng';
import { updateProgress } from '../../shared/storage';
import type { Page } from '../../pages/types';
import { Button, Panel, biText } from '../../ui/components';
import { append, h, svg } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  TRAINS_PER_ROUND, TRAVELLERS, checkClock, generateTrain, sameTime, stepClock,
  trainSpeech, type ClockTime, type TrainChallenge,
} from './logic';

export const stationPage: Page = (ctx) => {
  let { lang } = ctx;
  const rng = mulberry32((Date.now() ^ 0x94d049bb) >>> 0);
  const travellers = shuffle(rng, TRAVELLERS);
  let index = 0;
  let challenge: TrainChallenge = generateTrain(rng, index);
  let clock: ClockTime = pickStartClock(challenge);
  let solved = false;
  let closed = false;
  let translate = false;
  let message: Bi | null = null;
  const stamps: string[] = [];

  const host = h('div', { class: 'world world--station' });
  ctx.root.append(host);

  function pickStartClock(c: TrainChallenge): ClockTime {
    const start = { hour: 12, minute: 0 };
    return sameTime(start, c.target) ? { hour: 6, minute: 0 } : start;
  }

  const say = (m: Bi | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function adjust(delta: number) {
    if (solved || closed) return;
    clock = stepClock(clock, delta);
    say(null);
  }

  function dispatch() {
    if (solved || closed) return;
    const err = checkClock(challenge.target, clock);
    if (err) return say(err, 'dispatch');
    solved = true;
    const stamp = challenge.destination.emoji;
    stamps.push(stamp);
    updateProgress((p) => {
      p.station.dispatched += 1;
      if (!p.station.stamps.includes(stamp)) p.station.stamps.push(stamp);
    });
    say({
      es: `¡En punto! 🎫 El tren parte rumbo a ${challenge.destination.name.es} ${stamp}`,
      en: `Right on time! 🎫 The train departs for ${challenge.destination.name.en} ${stamp}`,
    }, 'next-train');
  }

  function nextTrain() {
    index++;
    if (index >= TRAINS_PER_ROUND) {
      closed = true;
    } else {
      challenge = generateTrain(rng, index);
      clock = pickStartClock(challenge);
      solved = false;
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
        noun: { es: 'Tren', en: 'Train' },
        index, total: TRAINS_PER_ROUND, lang,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'berry',
          title: { es: '¡Todos los trenes en marcha! 🚂', en: 'All trains departed! 🚂' },
          art: h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'sellos', en: 'stamps' }, lang) }, stamps.join(' ')),
          body: { es: 'Buen trabajo en la estación central. ¡Vuelve cuando quieras!', en: 'Great job at Central Station. Come back whenever you like!' },
          againLabel: { es: 'Otro turno', en: 'Another shift' },
          againFocusKey: 'another-shift',
          onAgain: () => ctx.refresh(),
          lang,
        }));
        return wrap;
      }

      const traveller = travellers[index % travellers.length];
      const pad = (n: number) => String(n).padStart(2, '0');
      const clockLabel = `${tr({ es: 'Reloj de la estación', en: 'Station clock' }, lang)}: ${clock.hour}:${pad(clock.minute)}`;
      const controls: [string, number, string][] = [
        ['− 1 h', -60, 'ctrl-m60'],
        ['+ 1 h', 60, 'ctrl-p60'],
        ['− 15 min', -15, 'ctrl-m15'],
        ['+ 15 min', 15, 'ctrl-p15'],
        ['− 5 min', -5, 'ctrl-m5'],
        ['+ 5 min', 5, 'ctrl-p5'],
      ];

      append(wrap, [
        CharacterBubble({
          emoji: traveller.emoji,
          mood: solved ? '🎫' : undefined,
          name: tr(traveller.name, lang),
          text: trainSpeech(challenge, lang),
          subText: trainSpeech(challenge, other(lang)),
          showSub: translate,
          lang,
          translatePressed: translate,
          onTranslate: () => { translate = !translate; draw(); },
          extra: h('span', { class: 'ticket-card' },
            `${challenge.destination.emoji} ${tr(challenge.destination.name, lang)}`),
        }),
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'station-stage', role: 'img', 'aria-label': clockLabel },
            analogClock(),
            h('p', { class: 'muted' }, tr({ es: 'Aguja roja = horas · Aguja negra = minutos', en: 'Red hand = hours · Black hand = minutes' }, lang))),
          Panel(`🕒 ${tr({ es: 'Ajustar el reloj', en: 'Set the clock' }, lang)}`, [
            h('div', { class: 'clock-controls' }, ...controls.map(([label, delta, fk]) =>
              Button(label, {
                variant: delta > 0 ? 'secondary' : 'ghost',
                disabled: solved,
                focusKey: fk,
                ariaLabel: `${label} (${clockLabel})`,
                onClick: () => adjust(delta),
              }))),
            Button(biText({ es: '¡Dar salida al tren!', en: 'Dispatch train!' }, lang), {
              onClick: dispatch, disabled: solved, large: true, focusKey: 'dispatch',
            }),
          ])),
        StatusBanner(message, lang),
        solved ? Button(tr({ es: 'Siguiente tren →', en: 'Next train →' }, lang), { onClick: nextTrain, large: true, focusKey: 'next-train' }) : null,
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
