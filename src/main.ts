import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/games.css';
import { colorsPage } from './games/colors/colors';
import { compassPage } from './games/compass/compass';
import { marketPage } from './games/market/market';
import { landingPage } from './pages/landing';
import type { Page, PageCleanup } from './pages/types';
import { loadProgress, updateProgress, type AgeBand } from './shared/storage';
import type { Lang } from './shared/i18n';
import { Button } from './ui/components';
import { h } from './ui/dom';

const routes: Record<string, Page> = {
  '/': landingPage,
  '/market': marketPage,
  '/compass': compassPage,
  '/colors': colorsPage,
};

const app = document.getElementById('app')!;
const header = h('header', { class: 'topbar' });
const main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
app.append(header, main);

let cleanup: void | PageCleanup;

function drawHeader() {
  const { lang, band } = loadProgress().settings;
  const focusedKey = header.contains(document.activeElement)
    ? (document.activeElement as HTMLElement).dataset.focus
    : undefined;
  const updateSettings = (settings: { lang: Lang; band: AgeBand }) => {
    const current = loadProgress().settings;
    if (current.lang === settings.lang && current.band === settings.band) return;
    updateProgress((p) => { p.settings = settings; });
    const { lang: nextLang, band: nextBand } = settings;
    document.documentElement.lang = nextLang;
    drawHeader();
    if (cleanup?.updateSettings) cleanup.updateSettings(nextLang, nextBand);
    else render();
  };
  header.replaceChildren(
    h('a', { class: 'logo', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '🦜 '), 'Lingua Play'),
    h('div', { class: 'toolbar' },
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Language / Idioma' },
        Button('Español', { variant: 'ghost', pressed: lang === 'es', focusKey: 'language-es', onClick: () => updateSettings({ lang: 'es', band }) }),
        Button('English', { variant: 'ghost', pressed: lang === 'en', focusKey: 'language-en', onClick: () => updateSettings({ lang: 'en', band }) })),
      h('div', { class: 'seg', role: 'group', 'aria-label': lang === 'es' ? 'Edad' : 'Age' },
        Button(lang === 'es' ? '7–10 años' : 'Ages 7–10', { variant: 'ghost', pressed: band === '7-10', focusKey: 'band-7-10', onClick: () => updateSettings({ lang, band: '7-10' }) }),
        Button(lang === 'es' ? '11–14 años' : 'Ages 11–14', { variant: 'ghost', pressed: band === '11-14', focusKey: 'band-11-14', onClick: () => updateSettings({ lang, band: '11-14' }) }))),
  );
  if (focusedKey) {
    Array.from(header.querySelectorAll<HTMLElement>('[data-focus]'))
      .find((el) => el.dataset.focus === focusedKey)?.focus();
  }
}

function render() {
  if (typeof cleanup === 'function') cleanup();
  const { lang, band } = loadProgress().settings;
  document.documentElement.lang = lang;
  drawHeader();
  main.replaceChildren();
  const path = location.hash.replace(/^#/, '') || '/';
  const page = Object.hasOwn(routes, path) ? routes[path] : landingPage;
  cleanup = page({ root: main, lang, band, refresh: render });
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
