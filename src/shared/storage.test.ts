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
    const p = sanitize({ settings: { lang: 'fr', band: '11-14' }, market: { served: -3, stickers: ['🍎', 5] }, compass: { found: 2.7 } });
    expect(p.settings).toEqual({ lang: 'es' });
    expect(p.market).toEqual({ served: 0, stickers: ['🍎'] });
    expect(p.compass.found).toBe(2);
  });

  it('persists updates and can be erased', () => {
    updateProgress((p) => { p.market.served = 4; });
    expect(loadProgress().market.served).toBe(4);
    clearProgress();
    expect(loadProgress().market.served).toBe(0);
  });

  it('retains updates in memory when storage writes fail and erases the fallback', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    updateProgress((p) => { p.settings.lang = 'en'; });
    expect(loadProgress().settings.lang).toBe('en');
    clearProgress();
    expect(loadProgress()).toEqual(defaultProgress());
    setItem.mockRestore();
  });
});
