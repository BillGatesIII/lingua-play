import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, clearProgress, defaultProgress, loadProgress, sanitize, updateProgress } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    clearProgress();
  });

  it('returns defaults when empty or corrupt', () => {
    expect(loadProgress()).toEqual(defaultProgress());
    localStorage.setItem(STORAGE_KEY, '{nope');
    expect(loadProgress()).toEqual(defaultProgress());
  });

  it('sanitizes untrusted data', () => {
    const p = sanitize({
      settings: { lang: 'fr', sound: 'yes', band: '11-14' },
      market: { served: -3, stickers: ['🍎', 5] },
      compass: { found: 2.7 },
      colors: { painted: 1, colours: ['🟣'] },
    });
    expect(p.settings).toEqual({ sound: true });
    expect(p.market).toEqual({ served: 0, stickers: ['🍎'] });
    expect(p.compass.found).toBe(2);
    expect(p.colors).toEqual({ painted: 1, colours: ['🟣'] });
    expect(p.recipe).toEqual({ cooked: 0, dishes: [] });
    expect(p.station).toEqual({ dispatched: 0, stamps: [] });
    expect(p.detective).toEqual({ solved: 0, badges: [] });
    expect(p.words).toEqual({ solved: 0, badges: [] });
    expect(p.garden).toEqual({ planted: 0, flowers: [] });
  });

  it('persists updates and can be erased', () => {
    updateProgress((p) => { p.market.served = 4; });
    expect(loadProgress().market.served).toBe(4);
    clearProgress();
    expect(loadProgress().market.served).toBe(0);
  });

  it('migrates and deduplicates saved treasures', () => {
    const p = sanitize({
      compass: { found: 3, treasures: ['🪙', '💰', '💎', '💎'] },
    });
    expect(p.compass.treasures).toEqual(['💰', '💎']);
  });

  it('retains updates in memory when storage writes fail and erases the fallback', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    updateProgress((p) => { p.settings.sound = false; });
    expect(loadProgress().settings.sound).toBe(false);
    clearProgress();
    expect(loadProgress()).toEqual(defaultProgress());
    setItem.mockRestore();
  });
});
