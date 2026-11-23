import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAlbumCode, decodeAlbumCode, encodeAlbumCode } from './albumCode';
import { SHELF_EMOJI_ENGLISH, type RewardShelf } from './rewards';
import { clearProgress, defaultProgress, loadProgress, updateProgress } from './storage';

describe('albumCode', () => {
  beforeEach(() => {
    localStorage.clear();
    clearProgress();
  });

  it('returns an empty string when no stickers are collected', () => {
    expect(encodeAlbumCode(defaultProgress())).toBe('');
  });

  it('round-trips stickers across multiple shelves including shared emojis', () => {
    const p = defaultProgress();
    p.market.stickers = ['🍎', '🧀'];
    p.compass.treasures = ['💎', '👑', '🗝️'];
    p.colors.colours = ['🌲', '🌸'];
    p.station.stamps = ['🌲'];
    p.garden.flowers = ['🌸'];

    const code = encodeAlbumCode(p);
    expect(code.startsWith('LP1-')).toBe(true);

    const decoded = decodeAlbumCode(code);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.count).toBe(9);
    expect(decoded.stickers.market).toEqual(['🍎', '🧀']);
    expect(decoded.stickers.compass).toEqual(['💎', '👑', '🗝️']);
    expect(decoded.stickers.colors).toEqual(['🌸', '🌲']);
    expect(decoded.stickers.station).toEqual(['🌲']);
    expect(decoded.stickers.garden).toEqual(['🌸']);
  });

  it('accepts lowercase, spaces, missing hyphens, unicode dashes, fullwidth chars, and O/I/L lookalikes including in prefix', () => {
    const p = defaultProgress();
    p.market.stickers = ['🍎'];
    p.detective.badges = ['🍪'];
    const code = encodeAlbumCode(p);

    const noisy = code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    const decoded = decodeAlbumCode(noisy);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.stickers.market).toEqual(['🍎']);
    expect(decoded.stickers.detective).toEqual(['🍪']);

    const fullwidthAndDashes = `ｌｐｉ–${code.slice(4).replace(/-/g, '—')}`;
    const decodedFw = decodeAlbumCode(fullwidthAndDashes);
    expect(decodedFw.ok).toBe(true);
    if (!decodedFw.ok) return;
    expect(decodedFw.stickers.market).toEqual(['🍎']);
    expect(decodedFw.stickers.detective).toEqual(['🍪']);
  });

  it('rejects empty, malformed, overlong, and typo-corrupted codes', () => {
    expect(decodeAlbumCode('   ')).toEqual({ ok: false, error: 'empty' });
    expect(decodeAlbumCode('HELLO')).toEqual({ ok: false, error: 'format' });
    expect(decodeAlbumCode('LP1-!')).toEqual({ ok: false, error: 'format' });
    expect(decodeAlbumCode(`LP1-${'A'.repeat(40)}`)).toEqual({ ok: false, error: 'format' });
    expect(decodeAlbumCode(`LP1-${'A'.repeat(300)}`)).toEqual({ ok: false, error: 'format' });

    // Even if a checksum happens to match, a zero mask or out-of-range mask is rejected as format error.
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    const findChecksumMatch = (payload: string) => {
      for (const a of alphabet) {
        for (const b of alphabet) {
          const res = decodeAlbumCode(`LP1-${payload}${a}${b}`);
          if (res.ok || res.error === 'format') return res;
        }
      }
      return null;
    };
    expect(findChecksumMatch('0')).toEqual({ ok: false, error: 'format' });
    expect(findChecksumMatch('Z'.repeat(28))).toEqual({ ok: false, error: 'format' });

    const p = defaultProgress();
    p.market.stickers = ['🍎', '🍞'];
    const code = encodeAlbumCode(p);
    const lastChar = code.slice(-1);
    const altered = code.slice(0, -1) + (lastChar === 'A' ? 'B' : 'A');
    expect(decodeAlbumCode(altered)).toEqual({ ok: false, error: 'checksum' });
  });

  it('round-trips a full album across every shelf', () => {
    const p = defaultProgress();
    p.market.stickers = Object.keys(SHELF_EMOJI_ENGLISH.market);
    p.compass.treasures = Object.keys(SHELF_EMOJI_ENGLISH.compass);
    p.colors.colours = Object.keys(SHELF_EMOJI_ENGLISH.colors);
    p.recipe.dishes = Object.keys(SHELF_EMOJI_ENGLISH.recipe);
    p.station.stamps = Object.keys(SHELF_EMOJI_ENGLISH.station);
    p.detective.badges = Object.keys(SHELF_EMOJI_ENGLISH.detective);
    p.words.badges = Object.keys(SHELF_EMOJI_ENGLISH.words);
    p.garden.flowers = Object.keys(SHELF_EMOJI_ENGLISH.garden);

    const expectedTotal = (Object.keys(SHELF_EMOJI_ENGLISH) as RewardShelf[])
      .reduce((sum, shelf) => sum + Object.keys(SHELF_EMOJI_ENGLISH[shelf]).length, 0);

    const code = encodeAlbumCode(p);
    const decoded = decodeAlbumCode(code);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.count).toBe(expectedTotal);
    expect(decoded.stickers.words).toEqual(p.words.badges);
  });

  it('merges decoded stickers into current progress without overwriting existing ones or sound setting', () => {
    const saved = defaultProgress();
    saved.compass.treasures = ['👑', '💎'];
    const code = encodeAlbumCode(saved);

    updateProgress((p) => {
      p.settings.sound = false;
      p.market.stickers = ['🍎'];
      p.compass.treasures = ['💎'];
    });

    const res = applyAlbumCode(code);
    expect(res).toEqual({ ok: true, totalLoaded: 2, addedCount: 1 });

    const current = loadProgress();
    expect(current.settings.sound).toBe(false);
    expect(current.market.stickers).toEqual(['🍎']);
    expect(current.compass.treasures).toEqual(['💎', '👑']);
  });

  it('resets stale yesterday stickers before applying an album code on a new day', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-23T14:00:00'));
      clearProgress();
      updateProgress((p) => { p.market.stickers = ['🍞']; });

      const saved = defaultProgress();
      saved.market.stickers = ['🍎'];
      const code = encodeAlbumCode(saved);

      vi.setSystemTime(new Date('2026-11-24T10:00:00'));
      const res = applyAlbumCode(code);
      expect(res).toEqual({ ok: true, totalLoaded: 1, addedCount: 1 });
      expect(loadProgress().market.stickers).toEqual(['🍎']);
    } finally {
      vi.useRealTimers();
    }
  });
});
