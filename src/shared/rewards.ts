import { COLORS } from '../games/colors/logic';
import { TREASURE_NAMES } from '../games/compass/logic';
import { MYSTERIES } from '../games/detective/logic';
import { FLOWER_NAMES } from '../games/garden/logic';
import { PRODUCTS } from '../games/market/logic';
import { DISHES } from '../games/recipe/logic';
import { DESTINATIONS } from '../games/station/logic';
import { WORDS } from '../games/words/logic';

export type RewardShelf =
  | 'market'
  | 'compass'
  | 'colors'
  | 'recipe'
  | 'station'
  | 'detective'
  | 'words'
  | 'garden';

const fromPairs = (pairs: Iterable<readonly [string, string]>): Record<string, string> =>
  Object.fromEntries(pairs);

/** Shelf-scoped emoji-to-English names derived directly from each game's logic definitions. */
export const SHELF_EMOJI_ENGLISH: Record<RewardShelf, Record<string, string>> = {
  market: fromPairs(PRODUCTS.map((p) => [p.emoji, p.en.one] as const)),
  compass: { ...TREASURE_NAMES },
  colors: fromPairs(Object.values(COLORS).map((c) => [c.emoji, c.name.en] as const)),
  recipe: fromPairs(DISHES.map((d) => [d.emoji, d.name.en] as const)),
  station: fromPairs(DESTINATIONS.map((d) => [d.emoji, d.name.en] as const)),
  detective: fromPairs(MYSTERIES.map((m) => [m.emoji, m.name] as const)),
  words: fromPairs(WORDS.map((w) => [w.emoji, w.answer.en] as const)),
  garden: { ...FLOWER_NAMES },
};

export function rewardEmojiEnglish(shelf: RewardShelf, emoji: string): string | undefined {
  return SHELF_EMOJI_ENGLISH[shelf][emoji];
}
