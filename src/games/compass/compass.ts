import { completeGameRound } from '../../shared/playBreak';
import { mulberry32, pick } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { createGameDirector } from '../../shared/speechDirector';
import { updateProgress } from '../../shared/storage';
import { addHoverVoice, speakEnglish } from '../../shared/voice';
import type { Page } from '../../pages/types';
import { Button, Panel, SpeakButton } from '../../ui/components';
import { append, h, svg } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { EndCard, GameHeader, ListenButton, StatusBanner } from '../../ui/gameShell';
import {
  DIRS, DIR_NAMES, JUNK, TEMPERATURE_TEXT, TREASURES, VECTORS, VOYAGE_LENGTH, clueText, distance,
  generateLevel, step, temperature, temperatureTrend, type Dir, type Level, type Pos,
} from './logic';

const ARROWS: Record<Dir, string> = { N: '▲', E: '▶', S: '▼', W: '◀' };
const KEYS: Record<string, Dir> = {
  ArrowUp: 'N', ArrowRight: 'E', ArrowDown: 'S', ArrowLeft: 'W', w: 'N', d: 'E', s: 'S', a: 'W',
};
const samePos = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;

export const compassPage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x85ebca6b) >>> 0);
  const director = createGameDirector(rng);
  let index = 0;
  let level: Level = generateLevel(rng, index);
  let pos: Pos = level.start;
  let used = 0;
  let bonusWind = 0;
  let pickupTaken = false;
  let trail: Pos[] = [level.start];
  let dug: Pos[] = [];
  let prevDigDist: number | null = null;
  let message: string | null = null;
  let found = false;
  let closed = false;
  const loot: string[] = [];

  const host = h('div', { class: 'world world--compass' });
  ctx.root.append(host);

  const left = () => Math.max(0, level.budget + bonusWind - used);
  const say = (m: string | null, focusTarget?: string) => { message = m; draw(focusTarget); };

  function move(dir: Dir, anchor?: HTMLElement) {
    if (found || closed) return;
    if (left() <= 0) {
      playSfx('oops');
      speakEnglish(director.pickLine('no-wind', [
        'No wind left! Dig here or sail back.',
        'Out of breeze! Try digging or head back to harbour.',
        'Flat sails! Dig now or start from the harbour.',
      ]), { anchor, mode: 'event' });
      return say('¡Se acabó el viento! 🌬️ Cava aquí o vuelve a empezar.');
    }
    const r = step(level, pos, dir);
    if (r.blocked) {
      playSfx('bonk');
      speakEnglish(director.pickLine('rock', [
        'Rock ahead! Watch out!',
        'Bonk! Try steering round that rock.',
        'Careful — rocky waters!',
        'Blocked! Pick another direction.',
      ]), { anchor, mode: 'event' });
      return say('¡Roca o borde del mapa! 🪨 Busca otro camino.');
    }
    pos = r.pos;
    used++;
    if (!trail.some((t) => samePos(t, pos))) trail = [...trail, pos];
    if (!pickupTaken && level.windPickup && samePos(pos, level.windPickup)) {
      pickupTaken = true;
      bonusWind += 2;
      playSfx('surprise');
      speakEnglish(director.pickLine('tailwind', [
        'Tailwind! Two extra gusts!',
        'Whoosh! A lucky breeze — two more moves!',
        'Lovely tailwind! Two extra puffs!',
      ]), { anchor, mode: 'event' });
      return say('¡Ráfaga a favor! 💨 Ganas 2 soplos de viento extra.');
    }
    playSfx('step');
    if (anchor) {
      speakEnglish(DIR_NAMES[dir].en, {
        anchor,
        mode: 'click',
        role: 'step',
        topic: `compass-${dir}`,
        coalesceKey: 'compass-step',
      });
    }
    say(null);
  }

  function dig(anchor?: HTMLElement) {
    if (found || closed) return;
    if (samePos(pos, level.target)) {
      const prize = pick(rng, TREASURES);
      loot.push(prize);
      updateProgress((p) => {
        p.compass.found += 1;
        if (!p.compass.treasures.includes(prize)) p.compass.treasures.push(prize);
      });
      found = true;
      playSfx('surprise');
      speakEnglish(director.celebrate(director.pickLine('treasure', [
        'Treasure! You found it!',
        'Ahoy! Treasure!',
        'X marks the spot!',
        'What a find!',
      ])), { anchor, mode: 'event' });
      return say(`¡Tesoro! ${prize} ¡Lo encontraste!`, 'next-treasure');
    }
    if (dug.some((d) => samePos(d, pos))) {
      playSfx('remove');
      speakEnglish(director.pickLine('already-dug', [
        'You already dug here!',
        'Just an old hole — try somewhere else!',
      ]), { anchor, mode: 'event' });
      return say('Aquí ya cavaste. 🕳️');
    }
    dug = [...dug, pos];
    const junk = pick(rng, JUNK);
    const dist = distance(pos, level.target);
    const temp = TEMPERATURE_TEXT[temperature(dist)];
    const trend = temperatureTrend(prevDigDist, dist);
    prevDigDist = dist;
    playSfx('bonk');
    const tempLine = `${temp.en}${trend ? ` ${trend.en}` : ''}`;
    const line = director.encourage(`${tempLine} Check the clue on the map!`, tempLine);
    speakEnglish(line, { anchor, mode: 'event' });
    say(`¡Has desenterrado ${junk.es}! ${junk.emoji} Pista: ${temp.es}${trend ? ` (${trend.es})` : ''}`);
  }

  function restart(anchor?: HTMLElement) {
    pos = level.start;
    used = 0;
    bonusWind = 0;
    pickupTaken = false;
    trail = [level.start];
    playSfx('remove');
    speakEnglish(director.pickLine('harbour', [
      'Back to harbour!',
      'Fresh start from the harbour!',
      'Returning to port!',
    ]), { anchor, mode: 'event' });
    say(null);
  }

  function next() {
    index++;
    director.nextPuzzle();
    if (index >= VOYAGE_LENGTH) {
      closed = true;
      completeGameRound();
      playSfx('levelUp');
      speakEnglish(director.pickLine('voyage-end', [
        'End of the voyage! Great sailing!',
        'All treasures found! Smashing voyage, captain!',
        'Splendid sailing! Back to port!',
        'What an adventure! Brilliant navigating!',
      ]), { mode: 'event' });
    } else {
      level = generateLevel(rng, index);
      pos = level.start; used = 0; bonusWind = 0; pickupTaken = false;
      trail = [level.start]; dug = []; prevDigDist = null; found = false;
      playSfx('step');
      const intro = director.transition('next-treasure', [
        'Next treasure!',
        'A new map clue awaits!',
        'Set sail for the next treasure!',
      ], 2);
      if (intro) speakEnglish(intro, { mode: 'event' });
    }
    message = null;
    draw(closed ? 'another-voyage' : 'dig');
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || found || closed) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!dir) return;
    e.preventDefault();
    move(dir);
  };
  document.addEventListener('keydown', onKey);

  function compassRose(): HTMLElement {
    const labels: [string, number, number][] = [
      ['N', 36, 14],
      ['S', 36, 65],
      ['E', 63, 41],
      ['O', 9, 41],
    ];
    const roseSvg = svg('svg', { class: 'compass-rose', viewBox: '0 0 72 72', 'aria-hidden': 'true' },
      svg('circle', { cx: 36, cy: 36, r: 33, fill: '#fffaf0', stroke: '#1f1b3d', 'stroke-width': 2.5 }),
      svg('polygon', { points: '36,16 42,36 36,32 30,36', fill: '#ff6b6b', stroke: '#1f1b3d', 'stroke-width': 1.5 }),
      svg('polygon', { points: '36,56 42,36 36,40 30,36', fill: '#0e7490', stroke: '#1f1b3d', 'stroke-width': 1.5 }),
      ...labels.map(([txt, x, y]) =>
        svg('text', { x, y, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 900, fill: '#1f1b3d' }, txt)));
    return SpeakButton(roseSvg, {
      english: 'North, South, East, West',
      className: 'compass-rose-btn',
      ariaLabel: 'Rosa de los vientos: escuchar puntos cardinales en inglés',
    });
  }

  function adjacentDir(p: Pos): Dir | null {
    for (const d of DIRS) {
      if (pos.x + VECTORS[d].x === p.x && pos.y + VECTORS[d].y === p.y) return d;
    }
    return null;
  }

  function map(): HTMLElement {
    const n = level.size;
    const cells: HTMLElement[] = [];
    for (let y = n; y >= 1; y--) {
      cells.push(h('span', { class: 'axis', 'aria-hidden': 'true' }, String(y)));
      for (let x = 1; x <= n; x++) {
        const p = { x, y };
        const isRock = level.rocks.some((r) => samePos(r, p));
        const isWind = Boolean(!pickupTaken && level.windPickup && samePos(level.windPickup, p));
        const isWake = trail.some((t) => samePos(t, p)) && !samePos(pos, p);
        let glyph = '';
        let cls = 'cell';
        if (isRock) glyph = '🪨';
        else if (level.landmarkPos && samePos(level.landmarkPos, p) && level.clue.kind === 'landmark') glyph = level.clue.landmark.emoji;
        else if (isWind) { glyph = '💨'; cls += ' cell--wind'; }
        else if (dug.some((d) => samePos(d, p))) glyph = '🕳️';
        if (samePos(level.start, p) && !samePos(pos, p)) glyph = glyph || '⚓';
        if (found && samePos(level.target, p) && !samePos(pos, p)) glyph = '❌';
        if (isWake && !glyph) { glyph = '〰️'; cls += ' cell--wake'; }
        else if (isWake) cls += ' cell--wake';
        if (samePos(pos, p)) { glyph = '⛵'; cls += ' cell--boat'; }

        const stepDir = !found && left() > 0 && !isRock ? adjacentDir(p) : null;
        if (stepDir) {
          const cellBtn = h('button', {
            type: 'button',
            class: `${cls} cell--step`,
            'data-focus': `cell-${x}-${y}`,
            'aria-label': `${DIR_NAMES[stepDir].es} (x=${x}, y=${y})`,
            onclick: (e: MouseEvent) => move(stepDir, e.currentTarget as HTMLElement),
          }, glyph);
          cells.push(addHoverVoice(cellBtn, isWind ? 'tailwind' : DIR_NAMES[stepDir].en, {
            role: isWind ? 'vocab' : 'chrome',
          }));
        } else {
          cells.push(h('span', { class: cls, 'aria-hidden': 'true' }, glyph));
        }
      }
    }
    cells.push(h('span', { class: 'axis', 'aria-hidden': 'true' }, ''));
    for (let x = 1; x <= n; x++) cells.push(h('span', { class: 'axis', 'aria-hidden': 'true' }, String(x)));
    const coordinates = (p: Pos) => `x = ${p.x}, y = ${p.y}`;
    const landmark = level.landmarkPos
      ? `Punto de referencia en ${coordinates(level.landmarkPos)}`
      : 'Sin punto de referencia';
    const rocks = level.rocks.map(coordinates).join('; ');
    return h('div', { class: 'sea', style: `--n:${n}`, role: 'region',
      'aria-label': `Mapa de ${n} × ${n}. Puerto en ${coordinates(level.start)}. ${landmark}. Rocas en ${rocks}. Barco en ${coordinates(pos)}.` }, ...cells);
  }

  function dpad(): HTMLElement {
    const btn = (d: Dir) => Button(
      h('span', {}, h('span', { 'aria-hidden': 'true' }, ARROWS[d]), ' ', h('span', { lang: 'es' }, DIR_NAMES[d].es)),
      {
        variant: 'secondary',
        className: `dir dir--${d}`,
        disabled: found || left() <= 0,
        focusKey: `dir-${d}`,
        ariaLabel: DIR_NAMES[d].es,
        voiceHover: DIR_NAMES[d].en,
        voiceRole: 'vocab',
        onClick: (e) => move(d, e.currentTarget as HTMLElement),
      },
    );
    return h('div', { class: 'dpad' }, ...DIRS.map(btn));
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🧭 Compass Island',
        noun: 'Tesoro',
        index, total: VOYAGE_LENGTH,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'sun',
          title: '¡Fin del viaje! 🏝️',
          art: h('p', { class: 'big-emoji', 'aria-label': 'tesoros' }, loot.join(' ')),
          body: 'El barco descansa en el puerto. ¡Vuelve cuando quieras!',
          againLabel: 'Otro viaje',
          againVoice: 'Another voyage',
          againFocusKey: 'another-voyage',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
        }));
        return wrap;
      }

      const spanishClue = clueText(level.clue, 'es');
      const englishClue = clueText(level.clue, 'en');
      const clueEl = SpeakButton(spanishClue, {
        english: englishClue,
        className: 'clue clue-btn',
        lang: 'es',
        ariaLabel: `${spanishClue} (toca para escuchar en inglés)`,
        hover: false,
      });

      const totalWind = level.budget + bonusWind;
      const windLeft = left();
      const pips = h('span', { class: 'wind-pips', 'aria-hidden': 'true' },
        ...Array.from({ length: totalWind }, (_, i) =>
          h('span', { class: `wind-pip ${i < windLeft ? '' : 'wind-pip--off'}` })));

      append(wrap, [
        h('div', { class: 'cols cols--map' },
          h('div', { class: 'map-stack' },
            h('div', { class: 'map-top' },
              h('p', { class: 'muted legend' },
                `⚓ puerto · 🪨 roca · ⛵ tú${level.windPickup ? ' · 💨 +2' : ''}`),
              compassRose()),
            map()),
          h('div', {},
            Panel('📜 Pista del mapa', [
              clueEl,
              ListenButton(englishClue, () => clueEl),
            ]),
            Panel('⛵ Navegar', [
              h('p', { class: 'action-cue' },
                'Lee la pista, mueve el barco y cava cuando estés en el tesoro.'),
              h('p', { class: 'wind', 'aria-live': 'polite', 'data-live': 'wind' },
                `🌬️ ${windLeft} soplos de viento · x = ${pos.x}, y = ${pos.y}`,
                pips),
              dpad(),
              h('div', { class: 'row' },
                Button('¡Cavar!', {
                  onClick: (e) => dig(e.currentTarget as HTMLElement),
                  disabled: found,
                  className: 'dig',
                  focusKey: 'dig',
                  voiceHover: 'Dig!',
                }),
                Button('Volver al puerto', {
                  variant: 'ghost',
                  onClick: (e) => restart(e.currentTarget as HTMLElement),
                  disabled: found,
                  focusKey: 'restart',
                  voiceHover: 'Back to harbour',
                })),
              h('p', { class: 'muted' }, 'Toca una casilla vecina, los botones o las flechas del teclado.'),
            ])),
        ),
        StatusBanner(message),
        found
          ? Button('Siguiente tesoro →', {
              onClick: next,
              large: true,
              focusKey: 'next-treasure',
              voiceHover: 'Next treasure',
            })
          : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
  return () => document.removeEventListener('keydown', onKey);
};
