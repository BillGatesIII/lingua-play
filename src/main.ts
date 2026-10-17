import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/games.css';
import { compassPage } from './games/compass/compass';
import { marketPage } from './games/market/market';
import { landingPage } from './pages/landing';
import type { Page } from './pages/types';
import { loadProgress, updateProgress, type AgeBand } from './shared/storage';
import type { Lang } from './shared/i18n';
import { Button } from './ui/components';
import { h } from './ui/dom';

const routes: Record<string, Page> = {
  '/': landingPage,
  '/market': marketPage,
  '/compass': compassPage,
};

const app = document.getElementById('app')!;
const header = h('header', { class: 'topbar' });
const main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
app.append(header, main);

let cleanup: void | (() => void);

function drawHeader() {
  const { lang, band } = loadProgress().settings;
  const setLang = (l: Lang) => { updateProgress((p) => { p.settings.lang = l; }); render(); };
  const setBand = (b: AgeBand) => { updateProgress((p) => { p.settings.band = b; }); render(); };
  header.replaceChildren(
    h('a', { class: 'logo', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '🦜 '), 'Lingua Play'),
    h('div', { class: 'toolbar' },
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Language / Idioma' },
        Button('Español', { variant: 'ghost', pressed: lang === 'es', onClick: () => setLang('es') }),
        Button('English', { variant: 'ghost', pressed: lang === 'en', onClick: () => setLang('en') })),
      h('div', { class: 'seg', role: 'group', 'aria-label': lang === 'es' ? 'Edad' : 'Age' },
        Button(lang === 'es' ? '7–10 años' : 'Ages 7–10', { variant: 'ghost', pressed: band === '7-10', onClick: () => setBand('7-10') }),
        Button(lang === 'es' ? '11–14 años' : 'Ages 11–14', { variant: 'ghost', pressed: band === '11-14', onClick: () => setBand('11-14') }))),
  );
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
render();
