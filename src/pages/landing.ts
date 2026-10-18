import { tr, type Bi } from '../shared/i18n';
import { clearProgress, loadProgress } from '../shared/storage';
import { Button, Card, biText } from '../ui/components';
import { h } from '../ui/dom';
import type { Page } from './types';

const PROMISES: { icon: string; text: Bi }[] = [
  { icon: '🚫', text: { es: 'Sin anuncios', en: 'No ads' } },
  { icon: '🕵️', text: { es: 'Sin rastreadores', en: 'No trackers' } },
  { icon: '🌙', text: { es: 'Sin prisas ni rachas', en: 'No timers or streaks' } },
  { icon: '💾', text: { es: 'Se guarda solo en tu dispositivo', en: 'Saved only on your device' } },
];

export const landingPage: Page = (ctx) => {
  const { lang } = ctx;
  const progress = loadProgress();
  const shelf = (title: Bi, items: string[]) =>
    h('div', { class: 'shelf-row' }, h('h3', {}, tr(title, lang)),
      h('p', { class: 'big-emoji', 'aria-label': items.join(' ') || '—' }, items.length ? items.join(' ') : '—'));

  ctx.root.append(
    h('section', { class: 'hero' },
      h('p', { class: 'hero__parrot', 'aria-hidden': 'true' }, '🦜'),
      h('h1', { class: 'hero__title' }, 'Lingua Play'),
      h('p', { class: 'hero__tag' }, biText({ es: '¡Juega primero! Las palabras y los números vienen contigo.', en: 'Play first! Words and numbers come along for the ride.' }, lang))),
    h('div', { class: 'cols cols--games' },
      Card([
        h('div', { class: 'game-card__art', 'aria-hidden': 'true' }, '🍎🧀🍞'),
        h('h2', {}, 'Market Quest'),
        h('p', {}, tr({ es: 'Atiende el puesto del mercado: llena la bolsa y devuelve el cambio.', en: 'Run the market stall: fill the bag and give the right change.' }, lang)),
        Button(`▶ ${tr({ es: 'Jugar', en: 'Play' }, lang)}`, { href: '#/market', large: true, ariaLabel: `Market Quest: ${tr({ es: 'Jugar', en: 'Play' }, lang)}` }),
      ], 'sun', 'game-card'),
      Card([
        h('div', { class: 'game-card__art', 'aria-hidden': 'true' }, '🧭🏝️⛵'),
        h('h2', {}, 'Compass Island'),
        h('p', {}, tr({ es: 'Sigue las pistas del mapa, navega entre rocas y encuentra el tesoro.', en: 'Follow the map clues, sail past the rocks and find the treasure.' }, lang)),
        Button(`▶ ${tr({ es: 'Jugar', en: 'Play' }, lang)}`, { href: '#/compass', large: true, variant: 'secondary', ariaLabel: `Compass Island: ${tr({ es: 'Jugar', en: 'Play' }, lang)}` }),
      ], 'sea', 'game-card'),
      Card([
        h('div', { class: 'game-card__art', 'aria-hidden': 'true' }, '🎨🦎🖌️'),
        h('h2', {}, 'Color Chameleon'),
        h('p', {}, tr({ es: 'Mezcla pinturas y pinta al camaleón del color que pide.', en: 'Mix paints and colour the chameleon the way it asks.' }, lang)),
        Button(`▶ ${tr({ es: 'Jugar', en: 'Play' }, lang)}`, { href: '#/colors', large: true, ariaLabel: `Color Chameleon: ${tr({ es: 'Jugar', en: 'Play' }, lang)}` }),
      ], 'leaf', 'game-card')),
    h('ul', { class: 'promises' }, ...PROMISES.map((p) =>
      h('li', {}, h('span', { 'aria-hidden': 'true' }, p.icon), ' ', tr(p.text, lang)))),
    Card([
      h('h2', {}, tr({ es: 'Mi colección', en: 'My collection' }, lang)),
      shelf({ es: 'Pegatinas del mercado', en: 'Market stickers' }, progress.market.stickers),
      shelf({ es: 'Tesoros de la isla', en: 'Island treasures' }, progress.compass.treasures),
      Button(tr({ es: 'Borrar mi progreso', en: 'Erase my progress' }, lang), {
        variant: 'ghost',
        onClick: () => {
          if (confirm(tr({ es: '¿Borrar todo lo guardado en este dispositivo?', en: 'Erase everything saved on this device?' }, lang))) {
            clearProgress();
            ctx.refresh();
          }
        },
      }),
    ], 'plain', 'collection'),
  );
};
