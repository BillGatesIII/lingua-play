import { other, tr, type Bi } from '../../shared/i18n';
import { mulberry32, pick } from '../../shared/rng';
import { updateProgress } from '../../shared/storage';
import type { Page } from '../../pages/types';
import { Button, Panel, biText } from '../../ui/components';
import { append, h, svg } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { EndCard, GameHeader, StatusBanner, TranslateButton } from '../../ui/gameShell';
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
  let { lang } = ctx;
  const rng = mulberry32((Date.now() ^ 0x85ebca6b) >>> 0);
  let index = 0;
  let level: Level = generateLevel(rng, index);
  let pos: Pos = level.start;
  let used = 0;
  let bonusWind = 0;
  let pickupTaken = false;
  let trail: Pos[] = [level.start];
  let dug: Pos[] = [];
  let prevDigDist: number | null = null;
  let message: Bi | null = null;
  let found = false;
  let closed = false;
  let translate = false;
  const loot: string[] = [];

  const host = h('div', { class: 'world world--compass' });
  ctx.root.append(host);

  const left = () => Math.max(0, level.budget + bonusWind - used);
  const say = (m: Bi | null, focusTarget?: string) => { message = m; draw(focusTarget); };

  function move(dir: Dir) {
    if (found || closed) return;
    if (left() <= 0) return say({ es: '¡Se acabó el viento! 🌬️ Cava aquí o vuelve a empezar.', en: 'The wind has died! 🌬️ Dig here or start over.' });
    const r = step(level, pos, dir);
    if (r.blocked) return say({ es: '¡Roca o borde del mapa! 🪨 Busca otro camino.', en: 'A rock or the map edge! 🪨 Find another way.' });
    pos = r.pos;
    used++;
    if (!trail.some((t) => samePos(t, pos))) trail = [...trail, pos];
    if (!pickupTaken && level.windPickup && samePos(pos, level.windPickup)) {
      pickupTaken = true;
      bonusWind += 2;
      return say({ es: '¡Ráfaga a favor! 💨 Ganas 2 soplos de viento extra.', en: 'Tailwind! 💨 You gained 2 extra gusts of wind.' });
    }
    say(null);
  }

  function dig() {
    if (found || closed) return;
    if (samePos(pos, level.target)) {
      const prize = pick(rng, TREASURES);
      loot.push(prize);
      updateProgress((p) => {
        p.compass.found += 1;
        if (!p.compass.treasures.includes(prize)) p.compass.treasures.push(prize);
      });
      found = true;
      return say({ es: `¡Tesoro! ${prize} ¡Lo encontraste!`, en: `Treasure! ${prize} You found it!` }, 'next-treasure');
    }
    if (dug.some((d) => samePos(d, pos))) return say({ es: 'Aquí ya cavaste. 🕳️', en: 'You already dug here. 🕳️' });
    dug = [...dug, pos];
    const junk = pick(rng, JUNK);
    const dist = distance(pos, level.target);
    const temp = TEMPERATURE_TEXT[temperature(dist)];
    const trend = temperatureTrend(prevDigDist, dist);
    prevDigDist = dist;
    say({
      es: `¡Has desenterrado ${junk.es}! ${junk.emoji} Pista: ${temp.es}${trend ? ` (${trend.es})` : ''}`,
      en: `You dug up ${junk.en}! ${junk.emoji} Hint: ${temp.en}${trend ? ` (${trend.en})` : ''}`,
    });
  }

  function restart() {
    pos = level.start;
    used = 0;
    bonusWind = 0;
    pickupTaken = false;
    trail = [level.start];
    say(null);
  }

  function next() {
    index++;
    if (index >= VOYAGE_LENGTH) closed = true;
    else {
      level = generateLevel(rng, index);
      pos = level.start; used = 0; bonusWind = 0; pickupTaken = false;
      trail = [level.start]; dug = []; prevDigDist = null; found = false;
    }
    message = null;
    draw(closed ? 'another-voyage' : 'dig');
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!dir) return;
    e.preventDefault();
    move(dir);
  };
  document.addEventListener('keydown', onKey);

  function compassRose(): SVGSVGElement {
    const labels: [string, number, number][] = [
      [lang === 'es' ? 'N' : 'N', 36, 14],
      [lang === 'es' ? 'S' : 'S', 36, 65],
      [lang === 'es' ? 'E' : 'E', 63, 41],
      [lang === 'es' ? 'O' : 'W', 9, 41],
    ];
    return svg('svg', { class: 'compass-rose', viewBox: '0 0 72 72', 'aria-hidden': 'true' },
      svg('circle', { cx: 36, cy: 36, r: 33, fill: '#fffaf0', stroke: '#1f1b3d', 'stroke-width': 2.5 }),
      svg('polygon', { points: '36,16 42,36 36,32 30,36', fill: '#ff6b6b', stroke: '#1f1b3d', 'stroke-width': 1.5 }),
      svg('polygon', { points: '36,56 42,36 36,40 30,36', fill: '#0e7490', stroke: '#1f1b3d', 'stroke-width': 1.5 }),
      ...labels.map(([txt, x, y]) =>
        svg('text', { x, y, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 900, fill: '#1f1b3d' }, txt)));
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
          cells.push(h('button', {
            type: 'button',
            class: `${cls} cell--step`,
            'data-focus': `cell-${x}-${y}`,
            'aria-label': `${DIR_NAMES[stepDir][lang]} (x=${x}, y=${y})`,
            onclick: () => move(stepDir),
          }, glyph));
        } else {
          cells.push(h('span', { class: cls, 'aria-hidden': 'true' }, glyph));
        }
      }
    }
    cells.push(h('span', { class: 'axis', 'aria-hidden': 'true' }, ''));
    for (let x = 1; x <= n; x++) cells.push(h('span', { class: 'axis', 'aria-hidden': 'true' }, String(x)));
    const coordinates = (p: Pos) => `x = ${p.x}, y = ${p.y}`;
    const landmark = level.landmarkPos
      ? `${tr({ es: 'Punto de referencia en', en: 'Landmark at' }, lang)} ${coordinates(level.landmarkPos)}`
      : tr({ es: 'Sin punto de referencia', en: 'No landmark' }, lang);
    const rocks = level.rocks.map(coordinates).join('; ');
    return h('div', { class: 'sea', style: `--n:${n}`, role: 'region',
      'aria-label': `${tr({ es: 'Mapa de', en: 'Map, size' }, lang)} ${n} × ${n}. ${tr({ es: 'Puerto en', en: 'Harbour at' }, lang)} ${coordinates(level.start)}. ${landmark}. ${tr({ es: 'Rocas en', en: 'Rocks at' }, lang)} ${rocks}. ${tr({ es: 'Barco en', en: 'Boat at' }, lang)} ${coordinates(pos)}.` }, ...cells);
  }

  function dpad(): HTMLElement {
    const btn = (d: Dir) => Button(
      h('span', {}, h('span', { 'aria-hidden': 'true' }, ARROWS[d]), ' ', h('span', { class: 'bi' },
        h('span', { class: 'bi__main', lang }, DIR_NAMES[d][lang]), h('span', { class: 'bi__sub', lang: other(lang) }, DIR_NAMES[d][other(lang)]))),
      {
        variant: 'secondary', className: `dir dir--${d}`, disabled: found || left() <= 0, focusKey: `dir-${d}`,
        ariaLabel: `${DIR_NAMES[d][lang]} / ${DIR_NAMES[d][other(lang)]}`, onClick: () => move(d),
      },
    );
    return h('div', { class: 'dpad' }, ...DIRS.map(btn));
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🧭 Compass Island',
        noun: { es: 'Tesoro', en: 'Treasure' },
        index, total: VOYAGE_LENGTH, lang,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'sun',
          title: { es: '¡Fin del viaje! 🏝️', en: 'End of the voyage! 🏝️' },
          art: h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'tesoros', en: 'treasures' }, lang) }, loot.join(' ')),
          body: { es: 'El barco descansa en el puerto. ¡Vuelve cuando quieras!', en: 'The ship rests in the harbour. Come back whenever you like!' },
          againLabel: { es: 'Otro viaje', en: 'Another voyage' },
          againFocusKey: 'another-voyage',
          onAgain: () => ctx.refresh(),
          lang,
        }));
        return wrap;
      }

      const clue = (l: typeof lang) => clueText(level.clue, l);
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
                `⚓ ${tr({ es: 'puerto', en: 'harbour' }, lang)} · 🪨 ${tr({ es: 'roca', en: 'rock' }, lang)} · ⛵ ${tr({ es: 'tú', en: 'you' }, lang)}${level.windPickup ? ` · 💨 +2` : ''}`),
              compassRose()),
            map()),
          h('div', {},
            Panel(`📜 ${tr({ es: 'Pista del mapa', en: 'Map clue' }, lang)}`, [
              h('p', { class: 'clue', lang }, clue(lang)),
              translate ? h('p', { class: 'clue clue--sub', lang: other(lang) }, clue(other(lang))) : null,
              TranslateButton(translate, lang, () => { translate = !translate; draw(); }),
            ]),
            Panel(`⛵ ${tr({ es: 'Navegar', en: 'Sail' }, lang)}`, [
              h('p', { class: 'wind', 'aria-live': 'polite', 'data-live': 'wind' },
                `🌬️ ${windLeft} ${tr({ es: 'soplos de viento', en: 'gusts of wind' }, lang)} · x = ${pos.x}, y = ${pos.y}`,
                pips),
              dpad(),
              h('div', { class: 'row' },
                Button(biText({ es: '¡Cavar!', en: 'Dig!' }, lang), { onClick: dig, disabled: found, className: 'dig', focusKey: 'dig' }),
                Button(tr({ es: 'Volver al puerto', en: 'Back to harbour' }, lang), { variant: 'ghost', onClick: restart, disabled: found, focusKey: 'restart' })),
              h('p', { class: 'muted' }, tr({ es: 'Toca una casilla vecina, los botones o las flechas del teclado.', en: 'Tap a neighbouring square, the buttons or the arrow keys.' }, lang)),
            ])),
        ),
        StatusBanner(message, lang),
        found ? Button(tr({ es: 'Siguiente tesoro →', en: 'Next treasure →' }, lang), { onClick: next, large: true, focusKey: 'next-treasure' }) : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
  return Object.assign(() => document.removeEventListener('keydown', onKey), {
    updateSettings(nextLang: typeof lang) {
      lang = nextLang;
      draw();
    },
  });
};
