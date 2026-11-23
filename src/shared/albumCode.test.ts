import { beforeEach, describe, expect, it } from 'vitest';
import { applyAlbumCode, decodeAlbumCode, encodeAlbumCode } from './albumCode';
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

  it('accepts lowercase, spaces, missing hyphens, and O/I/L visual lookalikes', () => {
    const p = defaultProgress();
    p.market.stickers = ['🍎'];
    p.detective.badges = ['🍪'];
    const code = encodeAlbumCode(p);

    const noisy = code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    // Keep prefix LP1 valid (first char L, second P, third 1)
    const fixedPrefix = `lp1 ${noisy.slice(3)}`;
    const decoded = decodeAlbumCode(fixedPrefix);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.stickers.market).toEqual(['🍎']);
    expect(decoded.stickers.detective).toEqual(['🍪']);
  });

  it('rejects empty, malformed, and typo-corrupted codes', () => {
    expect(decodeAlbumCode('   ')).toEqual({ ok: false, error: 'empty' });
    expect(decodeAlbumCode('HELLO')).toEqual({ ok: false, error: 'format' });
    expect(decodeAlbumCode('LP1-!')).toEqual({ ok: false, error: 'format' });

    const p = defaultProgress();
    p.market.stickers = ['🍎', '🍞'];
    const code = encodeAlbumCode(p);
    const lastChar = code.slice(-1);
    const altered = code.slice(0, -1) + (lastChar === 'A' ? 'B' : 'A');
    expect(decodeAlbumCode(altered)).toEqual({ ok: false, error: 'checksum' });
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
});
