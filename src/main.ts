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
import { loadProgress, updateProgress } from './shared/storage';
import type { Lang } from './shared/i18n';
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

let cleanup: void | PageCleanup;

function drawHeader() {
  const { lang } = loadProgress().settings;
  const focusedKey = header.contains(document.activeElement)
    ? (document.activeElement as HTMLElement).dataset.focus
    : undefined;
  const updateLang = (nextLang: Lang) => {
    if (loadProgress().settings.lang === nextLang) return;
    updateProgress((p) => { p.settings = { lang: nextLang }; });
    document.documentElement.lang = nextLang;
    drawHeader();
    if (cleanup?.updateSettings) cleanup.updateSettings(nextLang);
    else render();
  };
  header.replaceChildren(
    h('a', { class: 'logo', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '🦜 '), 'Lingua Play'),
    h('div', { class: 'toolbar' },
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Language / Idioma' },
        Button('Español', { variant: 'ghost', pressed: lang === 'es', focusKey: 'language-es', onClick: () => updateLang('es') }),
        Button('English', { variant: 'ghost', pressed: lang === 'en', focusKey: 'language-en', onClick: () => updateLang('en') }))),
  );
  if (focusedKey) {
    Array.from(header.querySelectorAll<HTMLElement>('[data-focus]'))
      .find((el) => el.dataset.focus === focusedKey)?.focus();
  }
}

function render() {
  if (typeof cleanup === 'function') cleanup();
  const { lang } = loadProgress().settings;
  document.documentElement.lang = lang;
  drawHeader();
  main.replaceChildren();
  const path = location.hash.replace(/^#/, '') || '/';
  const page = Object.hasOwn(routes, path) ? routes[path] : landingPage;
  cleanup = page({ root: main, lang, refresh: render });
}

window.addEventListener('hashchange', () => {
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
