import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/games.css';
import { colorsPage } from './games/colors/colors';
import { compassPage } from './games/compass/compass';
import { detectivePage } from './games/detective/detective';
import { gardenPage } from './games/garden/garden';
import { marketPage } from './games/market/market';
import { recipePage } from './games/recipe/recipe';
import { stationPage } from './games/station/station';
import { wordsPage } from './games/words/words';
import { landingPage } from './pages/landing';
import type { Page, PageCleanup } from './pages/types';
import { bindAudioUnlock, playSfx } from './shared/sfx';
import { loadProgress, updateProgress } from './shared/storage';
import { stopSpeech } from './shared/voice';
import { Button } from './ui/components';
import { h } from './ui/dom';

const routes: Record<string, Page> = {
  '/': landingPage,
  '/market': marketPage,
  '/compass': compassPage,
  '/colors': colorsPage,
  '/recipe': recipePage,
  '/station': stationPage,
  '/detective': detectivePage,
  '/words': wordsPage,
  '/garden': gardenPage,
};

const app = document.getElementById('app')!;
const header = h('header', { class: 'topbar' });
const main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
app.append(header, main);

bindAudioUnlock();

let cleanup: void | PageCleanup;

function drawHeader() {
  const { sound } = loadProgress().settings;
  const focusedKey = header.contains(document.activeElement)
    ? (document.activeElement as HTMLElement).dataset.focus
    : undefined;
  const toggleSound = () => {
    const next = !loadProgress().settings.sound;
    updateProgress((p) => { p.settings = { sound: next }; });
    if (!next) stopSpeech();
    else playSfx('pop');
    drawHeader();
  };
  header.replaceChildren(
    h('a', { class: 'logo', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '🦜 '), 'Lingua Play'),
    h('div', { class: 'toolbar' },
      Button(sound ? '🔊 Sonido' : '🔇 Silencio', {
        variant: 'ghost',
        pressed: sound,
        focusKey: 'sound-toggle',
        ariaLabel: sound ? 'Silenciar sonidos y voces' : 'Activar sonidos y voces',
        voiceHover: sound ? 'Sound on' : 'Sound off',
        onClick: toggleSound,
      })),
  );
  if (focusedKey) {
    Array.from(header.querySelectorAll<HTMLElement>('[data-focus]'))
      .find((el) => el.dataset.focus === focusedKey)?.focus();
  }
}

function render() {
  if (typeof cleanup === 'function') cleanup();
  document.documentElement.lang = 'es';
  drawHeader();
  main.replaceChildren();
  const path = location.hash.replace(/^#/, '') || '/';
  const page = Object.hasOwn(routes, path) ? routes[path] : landingPage;
  cleanup = page({ root: main, refresh: render });
}

window.addEventListener('hashchange', () => {
  stopSpeech();
  render();
  main.focus();
  window.scrollTo(0, 0);
});
document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
});
render();
