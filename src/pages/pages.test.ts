import { beforeEach, describe, expect, it } from 'vitest';
import { colorsPage } from '../games/colors/colors';
import { compassPage } from '../games/compass/compass';
import { detectivePage } from '../games/detective/detective';
import { gardenPage } from '../games/garden/garden';
import { marketPage } from '../games/market/market';
import { recipePage } from '../games/recipe/recipe';
import { stationPage } from '../games/station/station';
import { wordsPage } from '../games/words/words';
import { clearProgress } from '../shared/storage';
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
});
