import { tr, type Bi } from '../shared/i18n';
import { clearProgress, loadProgress } from '../shared/storage';
import { Button, Card, biText, type Tone } from '../ui/components';
import { h } from '../ui/dom';
import { renderKeepingFocus } from '../ui/focus';
import type { Page } from './types';

const PROMISES: { icon: string; text: Bi }[] = [
  { icon: '🚫', text: { es: 'Sin anuncios', en: 'No ads' } },
  { icon: '🕵️', text: { es: 'Sin rastreadores', en: 'No trackers' } },
  { icon: '🌙', text: { es: 'Sin prisas ni rachas', en: 'No timers or streaks' } },
  { icon: '💾', text: { es: 'Se guarda solo en tu dispositivo', en: 'Saved only on your device' } },
];

interface GameEntry {
  route: string;
  title: string;
  art: string;
  tag: Bi;
  desc: Bi;
  tone: Tone;
  btnVariant: 'primary' | 'secondary';
}

const GAMES: readonly GameEntry[] = [
  {
    route: '#/market',
    title: 'Market Quest',
    art: '🍎🧀🍞',
    tag: { es: 'Palabras · Sumas y cambio', en: 'Words · Totals & change' },
    desc: { es: 'Atiende el puesto del mercado: llena la bolsa y devuelve el cambio.', en: 'Run the market stall: fill the bag and give the right change.' },
    tone: 'sun',
    btnVariant: 'secondary',
  },
  {
    route: '#/compass',
    title: 'Compass Island',
    art: '🧭🏝️⛵',
    tag: { es: 'Rumbos · Coordenadas', en: 'Directions · Coordinates' },
    desc: { es: 'Sigue las pistas del mapa, navega entre rocas y encuentra el tesoro.', en: 'Follow the map clues, sail past the rocks and find the treasure.' },
    tone: 'sea',
    btnVariant: 'primary',
  },
  {
    route: '#/colors',
    title: 'Color Chameleon',
    art: '🎨🦎🖌️',
    tag: { es: 'Colores · Mezclas', en: 'Colours · Mixing' },
    desc: { es: 'Mezcla pinturas y pinta al camaleón del color que pide.', en: 'Mix paints and colour the chameleon the way it asks.' },
    tone: 'leaf',
    btnVariant: 'primary',
  },
  {
    route: '#/recipe',
    title: 'Recipe Lab',
    art: '🍳🍓🥛',
    tag: { es: 'Verbos · Fracciones', en: 'Verbs · Fractions' },
    desc: { es: 'Mide ¼, ½ y ¾ de taza, elige ingredientes y cocina platos locos.', en: 'Measure ¼, ½ and ¾ cups, pick ingredients and cook silly dishes.' },
    tone: 'peach',
    btnVariant: 'secondary',
  },
  {
    route: '#/station',
    title: 'Train Station',
    art: '🚂🕒🎫',
    tag: { es: 'La hora · Viajes', en: 'Telling time · Travel' },
    desc: { es: 'Ajusta el reloj de la estación para que cada viajero suba a su tren.', en: 'Set the station clock so every traveller catches their train.' },
    tone: 'berry',
    btnVariant: 'primary',
  },
  {
    route: '#/detective',
    title: 'Mystery Detective',
    art: '🔎🦊🍪',
    tag: { es: 'Lógica · Pistas', en: 'Logic · Clues' },
    desc: { es: 'Lee las pistas, descarta sospechosos y descubre quién fue.', en: 'Read the clues, rule out suspects and find out who did it.' },
    tone: 'lemon',
    btnVariant: 'secondary',
  },
  {
    route: '#/words',
    title: 'Word Workshop',
    art: '🔤🦉📚',
    tag: { es: 'Letras · Ortografía', en: 'Letters · Spelling' },
    desc: { es: 'Descifra pistas y ordena letras para encontrar cada palabra.', en: 'Solve clues and arrange letter tiles to discover each word.' },
    tone: 'sea',
    btnVariant: 'primary',
  },
  {
    route: '#/garden',
    title: 'Bloom Garden',
    art: '🌷🐝🌻',
    tag: { es: 'Series · Patrones', en: 'Sequences · Patterns' },
    desc: { es: 'Observa cómo crecen las flores y planta el paquete de semillas correcto.', en: 'Watch how the flowers grow and plant the right seed packet.' },
    tone: 'leaf',
    btnVariant: 'primary',
  },
];

export const landingPage: Page = (ctx) => {
  let { lang } = ctx;
  let confirmingErase = false;
  const host = h('div');
  ctx.root.append(host);

  const shelf = (title: Bi, items: string[]) =>
    h('div', { class: 'shelf-row' }, h('h3', {}, tr(title, lang)),
      h('p', { class: 'big-emoji', 'aria-label': items.join(' ') || '—' }, items.length ? items.join(' ') : '—'));

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const progress = loadProgress();
      const wrap = h('div');
      wrap.append(
        h('section', { class: 'hero' },
          h('p', { class: 'hero__parrot', 'aria-hidden': 'true' }, '🦜'),
          h('h1', { class: 'hero__title' }, 'Lingua Play'),
          h('p', { class: 'hero__tag' }, biText({ es: '¡Juega primero! Las palabras y los números vienen contigo.', en: 'Play first! Words and numbers come along for the ride.' }, lang))),
        h('div', { class: 'cols cols--games' }, ...GAMES.map((g) =>
          Card([
            h('div', { class: 'game-card__art', 'aria-hidden': 'true' }, g.art),
            h('span', { class: 'game-card__meta' }, tr(g.tag, lang)),
            h('h2', {}, g.title),
            h('p', {}, tr(g.desc, lang)),
            Button(`▶ ${tr({ es: 'Jugar', en: 'Play' }, lang)}`, {
              href: g.route, large: true, variant: g.btnVariant,
              ariaLabel: `${g.title}: ${tr({ es: 'Jugar', en: 'Play' }, lang)}`,
            }),
          ], g.tone, 'game-card'))),
        h('ul', { class: 'promises' }, ...PROMISES.map((p) =>
          h('li', {}, h('span', { 'aria-hidden': 'true' }, p.icon), ' ', tr(p.text, lang)))),
        Card([
          h('h2', {}, tr({ es: 'Mi colección', en: 'My collection' }, lang)),
          h('div', { class: 'cols' },
            shelf({ es: 'Pegatinas del mercado', en: 'Market stickers' }, progress.market.stickers),
            shelf({ es: 'Tesoros de la isla', en: 'Island treasures' }, progress.compass.treasures),
            shelf({ es: 'Colores del camaleón', en: 'Chameleon colours' }, progress.colors.colours),
            shelf({ es: 'Platos de la cocina', en: 'Kitchen dishes' }, progress.recipe.dishes),
            shelf({ es: 'Sellos de tren', en: 'Train stamps' }, progress.station.stamps),
            shelf({ es: 'Casos resueltos', en: 'Solved cases' }, progress.detective.badges),
            shelf({ es: 'Palabras mágicas', en: 'Word badges' }, progress.words.badges),
            shelf({ es: 'Flores del jardín', en: 'Garden flowers' }, progress.garden.flowers)),
          confirmingErase
            ? h('div', { class: 'confirm-box', role: 'alertdialog', 'aria-label': tr({ es: 'Confirmar borrado', en: 'Confirm erase' }, lang) },
                h('p', { class: 'confirm-box__text' }, tr({ es: '¿Borrar todo lo guardado en este dispositivo?', en: 'Erase everything saved on this device?' }, lang)),
                Button(tr({ es: 'Sí, borrar', en: 'Yes, erase' }, lang), {
                  variant: 'primary', focusKey: 'confirm-erase',
                  onClick: () => { clearProgress(); confirmingErase = false; ctx.refresh(); },
                }),
                Button(tr({ es: 'Cancelar', en: 'Cancel' }, lang), {
                  variant: 'ghost', focusKey: 'cancel-erase',
                  onClick: () => { confirmingErase = false; draw('erase-btn'); },
                }))
            : Button(tr({ es: 'Borrar mi progreso', en: 'Erase my progress' }, lang), {
                variant: 'ghost', focusKey: 'erase-btn',
                onClick: () => { confirmingErase = true; draw('cancel-erase'); },
              }),
        ], 'plain', 'collection'),
      );
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
