import { other, tr, type Bi } from '../../shared/i18n';
import { mulberry32, pick } from '../../shared/rng';
import { updateProgress } from '../../shared/storage';
import { createAdaptiveChallenge } from '../../shared/adaptive';
import type { Page } from '../../pages/types';
import { Button, Card, Panel, biText } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import {
  DIRS, DIR_NAMES, JUNK, TEMPERATURE_TEXT, TREASURES, VOYAGE_LENGTH, clueText, distance,
  generateLevel, step, temperature, type Dir, type Level, type Pos,
} from './logic';

const ARROWS: Record<Dir, string> = { N: '▲', E: '▶', S: '▼', W: '◀' };
const KEYS: Record<string, Dir> = {
  ArrowUp: 'N', ArrowRight: 'E', ArrowDown: 'S', ArrowLeft: 'W', w: 'N', d: 'E', s: 'S', a: 'W',
};
const samePos = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;

export const compassPage: Page = (ctx) => {
  let { lang } = ctx;
  const challenge = createAdaptiveChallenge();
  const rng = mulberry32((Date.now() ^ 0x85ebca6b) >>> 0);
  let index = 0;
  let level: Level = generateLevel(rng, challenge.level, index);
  let pos: Pos = level.start;
  let used = 0;
  let dug: Pos[] = [];
  let message: Bi | null = null;
  let found = false;
  let closed = false;
  let translate = false;
  let misses = 0;
  const loot: string[] = [];

  const host = h('div', { class: 'world world--compass' });
  ctx.root.append(host);

  const left = () => level.budget - used;
  const say = (m: Bi | null, focusTarget?: string) => { message = m; draw(focusTarget); };

  function move(dir: Dir) {
    if (found || closed) return;
    if (left() <= 0) {
      misses++;
      return say({ es: '¡Se acabó el viento! 🌬️ Cava aquí o vuelve a empezar.', en: 'The wind has died! 🌬️ Dig here or start over.' });
    }
    const r = step(level, pos, dir);
    if (r.blocked) {
      misses++;
      return say({ es: '¡Roca o borde del mapa! 🪨 Busca otro camino.', en: 'A rock or the map edge! 🪨 Find another way.' });
    }
    pos = r.pos;
    used++;
    say(null);
  }

  function dig() {
    if (found || closed) return;
    if (samePos(pos, level.target)) {
      const prize = pick(rng, TREASURES);
      loot.push(prize);
      challenge.complete(misses);
      misses = 0;
      updateProgress((p) => {
        p.compass.found += 1;
        if (!p.compass.treasures.includes(prize)) p.compass.treasures.push(prize);
      });
      found = true;
      return say({ es: `¡Tesoro! ${prize} ¡Lo encontraste!`, en: `Treasure! ${prize} You found it!` }, 'next-treasure');
    }
    if (dug.some((d) => samePos(d, pos))) return say({ es: 'Aquí ya cavaste. 🕳️', en: 'You already dug here. 🕳️' });
    misses++;
    dug = [...dug, pos];
    const junk = pick(rng, JUNK);
    const temp = TEMPERATURE_TEXT[temperature(distance(pos, level.target))];
    say({
      es: `¡Has desenterrado ${junk.es}! ${junk.emoji} Pista: ${temp.es}`,
      en: `You dug up ${junk.en}! ${junk.emoji} Hint: ${temp.en}`,
    });
  }

  function restart() {
    pos = level.start;
    used = 0;
    say(null);
  }

  function next() {
    index++;
    if (index >= VOYAGE_LENGTH) closed = true;
    else {
      level = generateLevel(rng, challenge.level, index);
      pos = level.start; used = 0; dug = []; found = false;
    }
    message = null;
    draw(closed ? 'another-voyage' : 'dig');
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!dir || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    e.preventDefault();
    move(dir);
  };
  document.addEventListener('keydown', onKey);

  function map(): HTMLElement {
    const n = level.size;
    const cells: HTMLElement[] = [];
    for (let y = n; y >= 1; y--) {
      cells.push(h('span', { class: 'axis' }, String(y)));
      for (let x = 1; x <= n; x++) {
        const p = { x, y };
        let glyph = '';
        let cls = 'cell';
        if (level.rocks.some((r) => samePos(r, p))) glyph = '🪨';
        else if (level.landmarkPos && samePos(level.landmarkPos, p) && level.clue.kind === 'landmark') glyph = level.clue.landmark.emoji;
        else if (dug.some((d) => samePos(d, p))) glyph = '🕳️';
        if (samePos(level.start, p) && !samePos(pos, p)) glyph = glyph || '⚓';
        if (found && samePos(level.target, p) && !samePos(pos, p)) glyph = '❌';
        if (samePos(pos, p)) { glyph = '⛵'; cls += ' cell--boat'; }
        cells.push(h('span', { class: cls, 'aria-hidden': 'true' }, glyph));
      }
    }
    cells.push(h('span', { class: 'axis' }, ''));
    for (let x = 1; x <= n; x++) cells.push(h('span', { class: 'axis' }, String(x)));
    const coordinates = (p: Pos) => `x = ${p.x}, y = ${p.y}`;
    const landmark = level.landmarkPos
      ? `${tr({ es: 'Punto de referencia en', en: 'Landmark at' }, lang)} ${coordinates(level.landmarkPos)}`
      : tr({ es: 'Sin punto de referencia', en: 'No landmark' }, lang);
    const rocks = level.rocks.map(coordinates).join('; ');
    return h('div', { class: 'sea', style: `--n:${n}`, role: 'img',
      'aria-label': `${tr({ es: 'Mapa de', en: 'Map, size' }, lang)} ${n} × ${n}. ${tr({ es: 'Puerto en', en: 'Harbour at' }, lang)} ${coordinates(level.start)}. ${landmark}. ${tr({ es: 'Rocas en', en: 'Rocks at' }, lang)} ${rocks}. ${tr({ es: 'Barco en', en: 'Boat at' }, lang)} ${coordinates(pos)}.` }, ...cells);
  }

  function dpad(): HTMLElement {
    const btn = (d: Dir) => {
      const b = Button(h('span', {}, h('span', { 'aria-hidden': 'true' }, ARROWS[d]), ' ', h('span', { class: 'bi' },
        h('span', { class: 'bi__main', lang }, DIR_NAMES[d][lang]), h('span', { class: 'bi__sub', lang: other(lang) }, DIR_NAMES[d][other(lang)]))), {
        variant: 'secondary', className: `dir dir--${d}`, disabled: found,
        ariaLabel: `${DIR_NAMES[d][lang]} / ${DIR_NAMES[d][other(lang)]}`, onClick: () => move(d),
      });
      b.dataset.focus = `dir-${d}`;
      return b;
    };
    return h('div', { class: 'dpad' }, ...DIRS.map(btn));
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(h('header', { class: 'game__head' },
        h('div', {}, h('h1', { class: 'game__title' }, '🧭 Compass Island'),
          h('p', { class: 'muted' }, `${tr({ es: 'Tesoro', en: 'Treasure' }, lang)} ${Math.min(index + 1, VOYAGE_LENGTH)} / ${VOYAGE_LENGTH}`)),
        Button('← ' + tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'ghost', href: '#/' })));

      if (closed) {
        wrap.append(Card([
          h('h2', {}, tr({ es: '¡Fin del viaje! 🏝️', en: 'End of the voyage! 🏝️' }, lang)),
          h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'tesoros', en: 'treasures' }, lang) }, loot.join(' ')),
          h('p', {}, tr({ es: 'El barco descansa en el puerto. ¡Vuelve cuando quieras!', en: 'The ship rests in the harbour. Come back whenever you like!' }, lang)),
          h('div', { class: 'row' },
            Button(tr({ es: 'Otro viaje', en: 'Another voyage' }, lang), { onClick: () => ctx.refresh(), focusKey: 'another-voyage' }),
            Button(tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'secondary', href: '#/' })),
        ], 'sun', 'end-card'));
        return wrap;
      }

      const clue = (l: typeof lang) => clueText(level.clue, l);
      append(wrap, [
        h('div', { class: 'cols cols--map' },
          h('div', {}, map(), h('p', { class: 'muted legend' }, `⚓ ${tr({ es: 'puerto', en: 'harbour' }, lang)} · 🪨 ${tr({ es: 'roca', en: 'rock' }, lang)} · ⛵ ${tr({ es: 'tú', en: 'you' }, lang)}`)),
          h('div', {},
            Panel(`📜 ${tr({ es: 'Pista del mapa', en: 'Map clue' }, lang)}`, [
              h('p', { class: 'clue', lang }, clue(lang)),
              translate ? h('p', { class: 'clue clue--sub', lang: other(lang) }, clue(other(lang))) : null,
              Button(`🦜 ${tr({ es: 'Traducir', en: 'Translate' }, lang)}`, { variant: 'ghost', pressed: translate, focusKey: 'translate', onClick: () => { translate = !translate; draw(); } }),
            ]),
            Panel(`⛵ ${tr({ es: 'Navegar', en: 'Sail' }, lang)}`, [
              h('p', { class: 'wind', 'aria-live': 'polite', 'data-live': 'wind' }, `🌬️ ${left()} ${tr({ es: 'soplos de viento', en: 'gusts of wind' }, lang)} · x = ${pos.x}, y = ${pos.y}`),
              dpad(),
              h('div', { class: 'row' },
                Button(biText({ es: '¡Cavar!', en: 'Dig!' }, lang), { onClick: dig, disabled: found, className: 'dig', focusKey: 'dig' }),
                Button(tr({ es: 'Volver al puerto', en: 'Back to harbour' }, lang), { variant: 'ghost', onClick: restart, disabled: found, focusKey: 'restart' })),
              h('p', { class: 'muted' }, tr({ es: 'También puedes usar las flechas del teclado.', en: 'You can also use the keyboard arrow keys.' }, lang)),
            ])),
        ),
        h('div', { class: `message ${message ? 'message--on' : ''}`, role: 'status', 'aria-live': 'polite', 'data-live': 'message' }, message ? biText(message, lang) : null),
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
