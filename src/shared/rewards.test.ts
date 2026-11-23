import { describe, expect, it } from 'vitest';
import { ALL_TARGETS, COLORS } from '../games/colors/logic';
import { TREASURES } from '../games/compass/logic';
import { MYSTERIES } from '../games/detective/logic';
import { FLOWERS } from '../games/garden/logic';
import { PRODUCTS } from '../games/market/logic';
import { DISHES } from '../games/recipe/logic';
import { DESTINATIONS } from '../games/station/logic';
import { WORDS } from '../games/words/logic';
import { rewardEmojiEnglish, rewardShelfTotal, type RewardShelf } from './rewards';

describe('reward emoji English labels', () => {
  it('resolves shared reward emojis using their shelf context', () => {
    expect(rewardEmojiEnglish('colors', '🌲')).toBe('dark green');
    expect(rewardEmojiEnglish('station', '🌲')).toBe('the forest');
    expect(rewardEmojiEnglish('colors', '🌸')).toBe('pink');
    expect(rewardEmojiEnglish('garden', '🌸')).toBe('cherry blossom');
    expect(rewardEmojiEnglish('station', '🏖️')).toBe('the beach');
    expect(rewardEmojiEnglish('words', '🏖️')).toBe('beach');
    expect(rewardEmojiEnglish('compass', '👑')).toBe('crown');
    expect(rewardEmojiEnglish('detective', '👑')).toBe('royal crown');
  });

  it('covers every reward emoji defined by each game', () => {
    const cases: [RewardShelf, readonly string[]][] = [
      ['market', PRODUCTS.map((p) => p.emoji)],
      ['compass', TREASURES],
      ['colors', Object.values(COLORS).map((c) => c.emoji)],
      ['recipe', DISHES.map((d) => d.emoji)],
      ['station', DESTINATIONS.map((d) => d.emoji)],
      ['detective', MYSTERIES.map((m) => m.emoji)],
      ['words', WORDS.map((w) => w.emoji)],
      ['garden', FLOWERS],
    ];
    for (const [shelf, emojis] of cases) {
      expect(new Set(emojis).size, `${shelf} duplicate reward emoji`).toBe(emojis.length);
      expect(rewardShelfTotal(shelf)).toBeGreaterThan(0);
      for (const emoji of emojis) {
        const label = rewardEmojiEnglish(shelf, emoji);
        expect(label, `${shelf}:${emoji}`).toBeTruthy();
      }
    }
    expect(rewardShelfTotal('colors')).toBe(ALL_TARGETS.length);
  });
});
