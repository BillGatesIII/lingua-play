import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/games.css';
import { colorsPage } from './games/colors/colors';
import { compassPage } from './games/compass/compass';
import { marketPage } from './games/market/market';
import { gardenPage } from './games/garden/garden';
import { recipePage } from './games/recipe/recipe';
import { wordsPage } from './games/words/words';
import { landingPage } from './pages/landing';
import type { Page, PageCleanup } from './pages/types';
import { loadProgress, updateProgress } from './shared/storage';
import {
  accumulateVisibleMilliseconds, addScreenSeconds, beginScreenBreak, formatScreenTime, loadScreenBalance, updateScreenBreakVisibility,
} from './shared/screen-break';
import { tr, type Lang } from './shared/i18n';
import { Button, Card } from './ui/components';
import { h } from './ui/dom';

const routes: Record<string, Page> = {
  '/': landingPage,
  '/market': marketPage,
  '/compass': compassPage,
  '/colors': colorsPage,
  '/recipe': recipePage,
  '/words': wordsPage,
  '/garden': gardenPage,
};

const app = document.getElementById('app')!;
const header = h('header', { class: 'topbar' });
const main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
app.append(header, main);

let cleanup: void | PageCleanup;
let resetScreenTimer: () => void = () => {};

function drawHeader() {
  const { lang } = loadProgress().settings;
  const focusedKey = header.contains(document.activeElement)
    ? (document.activeElement as HTMLElement).dataset.focus
    : undefined;
  const updateSettings = (nextLang: Lang) => {
    const current = loadProgress().settings;
    if (current.lang === nextLang) return;
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
      Button('Español', { variant: 'ghost', pressed: lang === 'es', focusKey: 'language-es', onClick: () => updateSettings('es') }),
      Button('English', { variant: 'ghost', pressed: lang === 'en', focusKey: 'language-en', onClick: () => updateSettings('en') })),
    ),
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
  const balance = loadScreenBalance();
  if (balance.restSeconds > 0) {
    header.replaceChildren();
    main.append(Card([
      h('p', { class: 'screen-break__art', 'aria-hidden': 'true' }, '🌿'),
      h('h1', {}, tr({ es: 'Pausa fuera de pantalla', en: 'Screen-free pause' }, lang)),
      h('p', {}, tr({
        es: `Tu pausa dura lo mismo que tu tiempo de juego. Queda: ${formatScreenTime(balance.restSeconds)}.`,
        en: `Your pause matches your gameplay time. Time left: ${formatScreenTime(balance.restSeconds)}.`,
      }, lang)),
      h('p', {}, tr({
        es: 'Deja el dispositivo y prueba algo real: estírate, dibuja un mapa o busca algo azul. El descanso solo cuenta mientras esta página no está visible.',
        en: 'Put the device down and try something real: stretch, draw a map, or find something blue. The pause counts only while this page is out of view.',
      }, lang)),
      !balance.breakArmed
        ? Button(tr({ es: 'Dejar el dispositivo y empezar', en: 'Put the device away and begin' }, lang), {
          large: true,
          onClick: () => {
            beginScreenBreak();
            render();
          },
        })
        : h('p', { class: 'screen-break__waiting', role: 'status', 'aria-live': 'polite' }, tr({
          es: '¡Bien! Cierra esta pestaña o pon el dispositivo en reposo. El tiempo empezará cuando la pantalla deje de estar visible.',
          en: 'Good choice! Close this tab or put the device to sleep. The pause begins when the screen is no longer visible.',
        }, lang)),
    ], 'leaf', 'screen-break'));
    return;
  }
  const path = location.hash.replace(/^#/, '') || '/';
  const page = Object.hasOwn(routes, path) ? routes[path] : landingPage;
  cleanup = page({ root: main, lang, refresh: render });
}

function attachScreenBalance() {
  let lastTick = Date.now();
  let remainder = 0;
  resetScreenTimer = () => {
    lastTick = Date.now();
    remainder = 0;
  };
  window.setInterval(() => {
    const path = location.hash.replace(/^#/, '') || '/';
    const now = Date.now();
    const elapsedMs = Math.max(0, now - lastTick);
    lastTick = now;
    if (path !== '/' && document.visibilityState === 'visible' && loadScreenBalance().restSeconds === 0) {
      const accumulated = accumulateVisibleMilliseconds(remainder, elapsedMs);
      remainder = accumulated.remainder;
      if (accumulated.seconds === 0) return;
      const balance = addScreenSeconds(accumulated.seconds);
      if (balance.restSeconds > 0) render();
    } else remainder = 0;
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    resetScreenTimer();
    const hadBreakDue = loadScreenBalance().restSeconds > 0;
    const balance = updateScreenBreakVisibility(document.hidden);
    if (!document.hidden && hadBreakDue) {
      if (balance.restSeconds === 0 && (location.hash.replace(/^#/, '') || '/') !== '/') location.hash = '#/';
      else render();
    }
  });
}

window.addEventListener('hashchange', () => {
  resetScreenTimer();
  render();
  main.focus();
  window.scrollTo(0, 0);
});
document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
});
updateScreenBreakVisibility(document.hidden);
attachScreenBalance();
render();
