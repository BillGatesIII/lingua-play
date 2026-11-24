import { beforeEach, describe, expect, it, vi } from 'vitest';
import { colorsPage } from '../games/colors/colors';
import { compassPage } from '../games/compass/compass';
import { detectivePage } from '../games/detective/detective';
import { gardenPage } from '../games/garden/garden';
import { marketPage } from '../games/market/market';
import { recipePage } from '../games/recipe/recipe';
import { stationPage } from '../games/station/station';
import { wordsPage } from '../games/words/words';
import { completeGameRound, loadBreakState, resetBreakState, startPlayBreak } from '../shared/playBreak';
import { resetSpeechSession } from '../shared/speechDirector';
import { clearProgress, loadProgress, updateProgress } from '../shared/storage';
import { stopSpeech } from '../shared/voice';
import { Button, SpeakButton } from '../ui/components';
import { landingPage } from './landing';
import type { Page } from './types';

describe('pages smoke & Spanish UI rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    clearProgress();
    stopSpeech();
    resetSpeechSession();
    document.body.innerHTML = '';
  });

  const pages: [string, Page][] = [
    ['landing', landingPage],
    ['market', marketPage],
    ['compass', compassPage],
    ['colors', colorsPage],
    ['recipe', recipePage],
    ['station', stationPage],
    ['detective', detectivePage],
    ['words', wordsPage],
    ['garden', gardenPage],
  ];

  it.each(pages)('renders %s in Spanish and cleans up cleanly', (_name, page) => {
    const root = document.createElement('main');
    document.body.append(root);
    const cleanup = page({ root, refresh: () => {} });
    expect(root.textContent?.length).toBeGreaterThan(20);
    if (typeof cleanup === 'function') cleanup();
  });

  it('forwards onClick on link buttons', () => {
    const onClick = vi.fn();
    const link = Button('▶ Jugar', { href: '#/market', onClick });
    document.body.append(link);
    expect(link.tagName).toBe('A');
    link.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('labels shared reward emojis per shelf on the landing page', () => {
    updateProgress((p) => {
      p.colors.colours = ['🌲', '🌸'];
      p.station.stamps = ['🌲'];
      p.garden.flowers = ['🌸'];
    });
    const root = document.createElement('main');
    document.body.append(root);
    landingPage({ root, refresh: () => {} });

    const shelfLabels = (heading: string) => {
      const row = [...root.querySelectorAll('.shelf-row')].find((el) => el.querySelector('h3')?.textContent === heading);
      return [...(row?.querySelectorAll('.badge-chip') ?? [])].map((el) => el.getAttribute('aria-label'));
    };

    expect(shelfLabels('Colores del camaleón')).toEqual(['🌲 (dark green)', '🌸 (pink)']);
    expect(shelfLabels('Sellos de tren')).toEqual(['🌲 (the forest)']);
    expect(shelfLabels('Flores del jardín')).toEqual(['🌸 (cherry blossom)']);

    const colorsRow = [...root.querySelectorAll('.shelf-row')].find((el) => el.querySelector('h3')?.textContent === 'Colores del camaleón');
    expect(colorsRow?.querySelector('.shelf-row__count')?.textContent).toBe('2/16');
  });

  it('lets Enter activate controls instead of checking the word in Word Workshop', () => {
    const root = document.createElement('main');
    document.body.append(root);
    const cleanup = wordsPage({ root, refresh: () => {} });

    const emptySlots = () => root.querySelectorAll('.letter-slot--empty').length;
    while (emptySlots() > 0) {
      const tile = root.querySelector<HTMLButtonElement>('.letter-rack .letter-tile:not(:disabled)');
      expect(tile).not.toBeNull();
      tile!.click();
    }

    const messageText = () => root.querySelector('[data-live="message"]')?.textContent?.trim() ?? '';

    const picBtn = root.querySelector<HTMLButtonElement>('.word-picture-btn')!;
    const picEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    picBtn.dispatchEvent(picEnter);
    expect(picEnter.defaultPrevented).toBe(false);
    expect(messageText()).toBe('');

    expect(root.querySelector('[data-focus="listen-en"]')).toBeNull();

    const bubble = root.querySelector<HTMLElement>('.bubble--interactive')!;
    const bubbleEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    bubble.dispatchEvent(bubbleEnter);
    expect(bubbleEnter.defaultPrevented).toBe(true);
    expect(messageText()).toBe('');

    const bodyEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    document.body.dispatchEvent(bodyEnter);
    expect(bodyEnter.defaultPrevented).toBe(true);
    expect(messageText().length).toBeGreaterThan(0);

    if (typeof cleanup === 'function') cleanup();
  });

  it('does not show popup bubbles on landing game cards or Jugar buttons, while speaking game titles', () => {
    vi.useFakeTimers();
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel: vi.fn(), getVoices: () => [] },
    });
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(t: string) {
        this.text = t;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    try {
      const root = document.createElement('main');
      document.body.append(root);
      const cleanup = landingPage({ root, refresh: () => {} });

      const firstCard = root.querySelector<HTMLElement>('.game-card')!;
      firstCard.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
      vi.advanceTimersByTime(320);
      expect(speak).toHaveBeenCalledTimes(1);
      expect((speak.mock.calls[0][0] as MockUtterance).text).toBe('Market Quest');
      expect(document.querySelector('.voice-bubble')).toBeNull();

      const playLink = firstCard.querySelector<HTMLAnchorElement>('a.btn')!;
      playLink.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
      vi.advanceTimersByTime(400);
      expect(document.querySelector('.voice-bubble')).toBeNull();

      if (typeof cleanup === 'function') cleanup();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('shows no standalone Escuchar en inglés button and triggers English voice on bubble hover', () => {
    vi.useFakeTimers();
    try {
      for (const page of [marketPage, compassPage, colorsPage, recipePage, stationPage, detectivePage, wordsPage, gardenPage]) {
        const root = document.createElement('main');
        document.body.append(root);
        const cleanup = page({ root, refresh: () => {} });
        expect(root.querySelector('[data-focus="listen-en"]')).toBeNull();
        expect(root.textContent).not.toContain('Escuchar en inglés');
        if (typeof cleanup === 'function') cleanup();
        root.remove();
      }

      const detRoot = document.createElement('main');
      document.body.append(detRoot);
      detectivePage({ root: detRoot, refresh: () => {} });
      const topBubble = detRoot.querySelector<HTMLElement>('.bubble--interactive')!;
      expect(topBubble.textContent).not.toContain('Pistas:');
      expect(detRoot.querySelectorAll('.clue-list .clue-btn').length).toBeGreaterThanOrEqual(2);

      topBubble.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
      vi.advanceTimersByTime(500);
      const voiceBubble = document.querySelector<HTMLElement>('.voice-bubble');
      expect(voiceBubble?.hidden).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders interactive SVG chameleon with mixing slots and brush painting in Color Chameleon', () => {
    const root = document.createElement('main');
    document.body.append(root);
    colorsPage({ root, refresh: () => {} });

    expect(root.querySelector('.chameleon-svg')).not.toBeNull();
    expect(root.querySelector('.mix-recipe')).not.toBeNull();
    const firstPot = root.querySelector<HTMLButtonElement>('[data-focus="pot-red"]')!;
    firstPot.click();
    expect(root.querySelector('.chameleon-canvas--ready')).not.toBeNull();
    expect(root.querySelector('.mix-result--ready')).not.toBeNull();

    // Pressing Enter on the canvas applies the mixed paint to the chameleon
    const canvas = root.querySelector<HTMLElement>('[data-focus="chameleon-canvas"]')!;
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(root.querySelector('[data-live="message"]')?.textContent?.length).toBeGreaterThan(5);
  });

  it('renders draggable SVG clock hands without the old button grid in Train Station', () => {
    const root = document.createElement('main');
    document.body.append(root);
    stationPage({ root, refresh: () => {} });

    expect(root.querySelector('.clock-controls')).toBeNull();
    expect(root.querySelector('.clock-knob--hour')).not.toBeNull();
    expect(root.querySelector('.clock-knob--minute')).not.toBeNull();

    const clockWrap = root.querySelector<HTMLElement>('[data-focus="station-clock"]')!;
    const before = clockWrap.getAttribute('aria-label');
    clockWrap.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    const after = root.querySelector<HTMLElement>('[data-focus="station-clock"]')?.getAttribute('aria-label');
    expect(after).not.toBe(before);
  });

  it('erases both saved progress and play-break state on the landing page', () => {
    resetBreakState();
    updateProgress((p) => { p.market.served = 3; p.market.stickers = ['🍎']; });
    completeGameRound();
    completeGameRound();
    startPlayBreak();

    const root = document.createElement('main');
    document.body.append(root);
    const refresh = vi.fn();
    landingPage({ root, refresh });

    root.querySelector<HTMLButtonElement>('[data-focus="erase-btn"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-focus="confirm-erase"]')?.click();

    expect(loadProgress().market.served).toBe(0);
    expect(loadBreakState()).toEqual({ roundsSinceBreak: 0, totalBreaks: 0, resting: false });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('generates and restores an album code from the Mi código panel on the landing page', () => {
    updateProgress((p) => {
      p.market.stickers = ['🍎'];
      p.compass.treasures = ['👑', '💎'];
    });
    const root = document.createElement('main');
    document.body.append(root);
    landingPage({ root, refresh: () => {} });

    root.querySelector<HTMLButtonElement>('[data-focus="code-toggle"]')?.click();
    const codeText = root.querySelector('.code-box__value')?.textContent?.trim() ?? '';
    expect(codeText.startsWith('LP1-')).toBe(true);

    clearProgress();
    root.innerHTML = '';
    landingPage({ root, refresh: () => {} });
    root.querySelector<HTMLButtonElement>('[data-focus="code-toggle"]')?.click();

    const input = root.querySelector<HTMLInputElement>('[data-focus="code-input"]')!;
    input.value = codeText;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector<HTMLFormElement>('.code-box__form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(loadProgress().market.stickers).toEqual(['🍎']);
    expect(loadProgress().compass.treasures).toEqual(['💎', '👑']);
    expect(root.querySelector('[data-live="code-status"]')?.textContent).toContain('¡Álbum cargado!');
  });

  it('handles clipboard success/failure honestly and preserves live code-status region', async () => {
    updateProgress((p) => { p.market.stickers = ['🍎']; });
    const root = document.createElement('main');
    document.body.append(root);
    landingPage({ root, refresh: () => {} });

    root.querySelector<HTMLButtonElement>('[data-focus="code-toggle"]')?.click();
    const statusRegion = root.querySelector('[data-live="code-status"]');
    expect(statusRegion).not.toBeNull();

    // Submitting empty keeps the same live region element and populates an error
    root.querySelector<HTMLFormElement>('.code-box__form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(root.querySelector('[data-live="code-status"]')).toBe(statusRegion);
    expect(statusRegion?.textContent).toContain('Escribe un código');

    // Clipboard failure/unavailability does not falsely report Copied!
    const origClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    try {
      root.querySelector<HTMLButtonElement>('[data-focus="copy-code"]')?.click();
      expect(root.querySelector('[data-focus="copy-code"]')?.textContent).not.toContain('¡Copiado!');
      expect(root.querySelector('[data-live="copy-status"]')?.textContent).toContain('Ctrl+C');

      // Clipboard success updates to Copied!
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
      root.querySelector<HTMLButtonElement>('[data-focus="copy-code"]')?.click();
      await Promise.resolve();
      await Promise.resolve();
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(root.querySelector('[data-focus="copy-code"]')?.textContent).toContain('¡Copiado!');
      expect(root.querySelector('[data-live="copy-status"]')?.textContent).toBe('');
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: origClipboard });
    }
  });

  it('clears sticker celebration class cleanly and skips it when reduced motion is enabled', () => {
    vi.useFakeTimers();
    const originalMatchMedia = window.matchMedia;
    try {
      updateProgress((p) => { p.market.stickers = ['🍎']; });
      const root = document.createElement('main');
      document.body.append(root);
      const cleanup = landingPage({ root, refresh: () => {} });

      const chip = root.querySelector<HTMLButtonElement>('.badge-chip')!;
      chip.click();
      expect(chip.classList.contains('badge-chip--celebrate')).toBe(true);
      vi.advanceTimersByTime(600);
      expect(chip.classList.contains('badge-chip--celebrate')).toBe(false);
      if (typeof cleanup === 'function') cleanup();

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      const root2 = document.createElement('main');
      document.body.append(root2);
      const cleanup2 = landingPage({ root: root2, refresh: () => {} });
      const chip2 = root2.querySelector<HTMLButtonElement>('.badge-chip')!;
      chip2.click();
      expect(chip2.classList.contains('badge-chip--celebrate')).toBe(false);
      if (typeof cleanup2 === 'function') cleanup2();
    } finally {
      window.matchMedia = originalMatchMedia;
      vi.useRealTimers();
    }
  });

  it('shows a speech bubble when clicking a SpeakButton', () => {
    const btn = SpeakButton('🍎', { english: 'apple', ariaLabel: 'apple' });
    document.body.append(btn);
    btn.click();
    const bubble = document.querySelector<HTMLElement>('.voice-bubble');
    expect(bubble?.hidden).toBe(false);
    expect(bubble?.textContent).toContain('apple');
  });

  it('animates landing icons subtly one at a time and cleans up timers', () => {
    vi.useFakeTimers();
    try {
      const root = document.createElement('main');
      document.body.append(root);
      const cleanup = landingPage({ root, refresh: () => {} });

      const icons = root.querySelectorAll<HTMLElement>('[data-motion]');
      expect(icons.length).toBe(28);
      expect(root.querySelectorAll('.is-alive').length).toBe(0);

      vi.advanceTimersByTime(800);
      expect(root.querySelectorAll('.is-alive').length).toBe(1);

      vi.advanceTimersByTime(3000);
      expect(root.querySelectorAll('.is-alive').length).toBeLessThanOrEqual(2);

      if (typeof cleanup === 'function') cleanup();
      // Cleanup clears active .is-alive classes and prevents further ambient animations
      expect(root.querySelectorAll('.is-alive').length).toBe(0);
      vi.advanceTimersByTime(10000);
      expect(root.querySelectorAll('.is-alive').length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ripples a game card on hover/focus, clears on animationend, and skips when reduced motion is enabled', () => {
    vi.useFakeTimers();
    try {
      const root = document.createElement('main');
      document.body.append(root);
      const cleanup = landingPage({ root, refresh: () => {} });

      const firstCard = root.querySelector<HTMLElement>('.game-card')!;
      const cardIcons = Array.from(firstCard.querySelectorAll<HTMLElement>('[data-motion]'));
      expect(cardIcons.length).toBe(3);

      // Hovering inside the card ripples its 3 icons in a staggered wave
      firstCard.dispatchEvent(new Event('pointerover', { bubbles: true }));
      expect(cardIcons.map((el) => el.classList.contains('is-alive'))).toEqual([true, false, false]);

      // Child-to-child pointerover inside the same card does not cancel/restart the wave
      const cardHeading = firstCard.querySelector('h2')!;
      cardHeading.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, relatedTarget: firstCard }));

      vi.advanceTimersByTime(140);
      expect(cardIcons.map((el) => el.classList.contains('is-alive'))).toEqual([true, true, false]);

      // animationend clears .is-alive promptly before fallback timeout
      cardIcons[0].dispatchEvent(new Event('animationend'));
      expect(cardIcons[0].classList.contains('is-alive')).toBe(false);

      // cleanup cancels pending staggered wave timers (icon 2 at 280ms) and beat timers (700ms)
      if (typeof cleanup === 'function') cleanup();
      vi.advanceTimersByTime(1000);
      expect(root.querySelectorAll('.is-alive').length).toBe(0);

      // Keyboard focusin on a card link ripples that card's icons, and survives redraws
      const root2 = document.createElement('main');
      document.body.append(root2);
      const cleanup2 = landingPage({ root: root2, refresh: () => {} });
      root2.querySelector<HTMLButtonElement>('[data-focus="erase-btn"]')?.click();
      const secondCard = root2.querySelectorAll<HTMLElement>('.game-card')[1]!;
      const secondLink = secondCard.querySelector<HTMLAnchorElement>('a.btn')!;
      secondLink.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(secondCard.querySelector('[data-motion]')?.classList.contains('is-alive')).toBe(true);
      if (typeof cleanup2 === 'function') cleanup2();

      // prefers-reduced-motion disables choreography altogether
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      try {
        const reducedRoot = document.createElement('main');
        document.body.append(reducedRoot);
        const reducedCleanup = landingPage({ root: reducedRoot, refresh: () => {} });
        reducedRoot.querySelector('.game-card')!.dispatchEvent(new Event('pointerover', { bubbles: true }));
        vi.advanceTimersByTime(5000);
        expect(reducedRoot.querySelectorAll('.is-alive').length).toBe(0);
        if (typeof reducedCleanup === 'function') reducedCleanup();
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
