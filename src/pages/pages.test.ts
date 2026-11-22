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
import { clearProgress, loadProgress, updateProgress } from '../shared/storage';
import { Button, SpeakButton } from '../ui/components';
import { landingPage } from './landing';
import type { Page } from './types';

describe('pages smoke & Spanish UI rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    clearProgress();
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

    const listenBtn = root.querySelector<HTMLButtonElement>('[data-focus="listen-en"]')!;
    const listenEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    listenBtn.dispatchEvent(listenEnter);
    expect(listenEnter.defaultPrevented).toBe(false);
    expect(messageText()).toBe('');

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

  it('shows a speech bubble when clicking a SpeakButton', () => {
    const btn = SpeakButton('🍎', { english: 'apple', ariaLabel: 'apple' });
    document.body.append(btn);
    btn.click();
    const bubble = document.querySelector<HTMLElement>('.voice-bubble');
    expect(bubble?.hidden).toBe(false);
    expect(bubble?.textContent).toContain('apple');
  });
});
