import { SHELF_EMOJI_ENGLISH, type RewardShelf } from './rewards';
import { updateProgress, type Progress } from './storage';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFIX = 'LP1';
const CHECKSUM_MOD = 1024; // 2 base32 chars (10 bits)

const SHELF_ORDER: readonly RewardShelf[] = [
  'market',
  'compass',
  'colors',
  'recipe',
  'station',
  'detective',
  'words',
  'garden',
];

interface CatalogEntry {
  shelf: RewardShelf;
  emoji: string;
}

const CATALOG: readonly CatalogEntry[] = SHELF_ORDER.flatMap((shelf) =>
  Object.keys(SHELF_EMOJI_ENGLISH[shelf]).map((emoji) => ({ shelf, emoji })),
);

const INDEX_BY_KEY = new Map<string, number>(
  CATALOG.map((entry, idx) => [`${entry.shelf}:${entry.emoji}`, idx]),
);

function shelfItems(p: Progress, shelf: RewardShelf): string[] {
  switch (shelf) {
    case 'market': return p.market.stickers;
    case 'compass': return p.compass.treasures;
    case 'colors': return p.colors.colours;
    case 'recipe': return p.recipe.dishes;
    case 'station': return p.station.stamps;
    case 'detective': return p.detective.badges;
    case 'words': return p.words.badges;
    case 'garden': return p.garden.flowers;
  }
}

function setShelfItems(p: Progress, shelf: RewardShelf, items: string[]): void {
  switch (shelf) {
    case 'market': p.market.stickers = items; break;
    case 'compass': p.compass.treasures = items; break;
    case 'colors': p.colors.colours = items; break;
    case 'recipe': p.recipe.dishes = items; break;
    case 'station': p.station.stamps = items; break;
    case 'detective': p.detective.badges = items; break;
    case 'words': p.words.badges = items; break;
    case 'garden': p.garden.flowers = items; break;
  }
}

function checksumChars(payload: string): string {
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const value = hash % CHECKSUM_MOD;
  return ALPHABET[(value >> 5) & 31] + ALPHABET[value & 31];
}

function encodeBigIntBase32(value: bigint): string {
  if (value === 0n) return ALPHABET[0];
  let n = value;
  let out = '';
  while (n > 0n) {
    out = ALPHABET[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out;
}

function decodeBigIntBase32(str: string): bigint | null {
  let out = 0n;
  for (const ch of str) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return null;
    out = (out << 5n) | BigInt(idx);
  }
  return out;
}

function groupCode(body: string): string {
  const chunks = body.match(/.{1,4}/g) ?? [body];
  return `${PREFIX}-${chunks.join('-')}`;
}

/** Encodes all collected stickers in `progress` into a short, typo-checked shareable code. */
export function encodeAlbumCode(progress: Progress): string {
  let mask = 0n;
  for (const shelf of SHELF_ORDER) {
    for (const emoji of shelfItems(progress, shelf)) {
      const idx = INDEX_BY_KEY.get(`${shelf}:${emoji}`);
      if (idx !== undefined) {
        mask |= 1n << BigInt(idx);
      }
    }
  }
  if (mask === 0n) return '';
  const payload = encodeBigIntBase32(mask);
  const check = checksumChars(payload);
  return groupCode(payload + check);
}

export type DecodeAlbumResult =
  | { ok: true; stickers: Record<RewardShelf, string[]>; count: number }
  | { ok: false; error: 'empty' | 'format' | 'checksum' };

/** Decodes and validates an album code back into per-shelf reward emojis. */
export function decodeAlbumCode(raw: string): DecodeAlbumResult {
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]+/g, '');
  if (!cleaned) return { ok: false, error: 'empty' };
  if (!cleaned.startsWith(PREFIX)) return { ok: false, error: 'format' };

  const body = cleaned
    .slice(PREFIX.length)
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');

  if (body.length < 3) return { ok: false, error: 'format' };
  const payload = body.slice(0, -2);
  const givenCheck = body.slice(-2);

  for (const ch of body) {
    if (!ALPHABET.includes(ch)) return { ok: false, error: 'format' };
  }
  if (checksumChars(payload) !== givenCheck) {
    return { ok: false, error: 'checksum' };
  }

  const mask = decodeBigIntBase32(payload);
  if (mask === null || mask === 0n) return { ok: false, error: 'format' };
  if (mask >= (1n << BigInt(CATALOG.length))) return { ok: false, error: 'format' };

  const stickers: Record<RewardShelf, string[]> = {
    market: [],
    compass: [],
    colors: [],
    recipe: [],
    station: [],
    detective: [],
    words: [],
    garden: [],
  };

  let count = 0;
  for (let i = 0; i < CATALOG.length; i++) {
    if ((mask & (1n << BigInt(i))) !== 0n) {
      const entry = CATALOG[i];
      stickers[entry.shelf].push(entry.emoji);
      count += 1;
    }
  }

  return { ok: true, stickers, count };
}

export type ApplyAlbumCodeResult =
  | { ok: true; totalLoaded: number; addedCount: number }
  | { ok: false; error: 'empty' | 'format' | 'checksum' };

/** Decodes an album code and merges its stickers into the current progress without losing existing ones. */
export function applyAlbumCode(raw: string): ApplyAlbumCodeResult {
  const decoded = decodeAlbumCode(raw);
  if (!decoded.ok) return decoded;

  let addedCount = 0;
  updateProgress((p) => {
    for (const shelf of SHELF_ORDER) {
      const existing = shelfItems(p, shelf);
      const merged = [...existing];
      for (const emoji of decoded.stickers[shelf]) {
        if (!merged.includes(emoji)) {
          merged.push(emoji);
          addedCount += 1;
        }
      }
      setShelfItems(p, shelf, merged);
    }
  });

  return { ok: true, totalLoaded: decoded.count, addedCount };
}
