# 🦜 Lingua Play

Ad-free, tracker-free Spanish/English games for kids aged 8–12, where the language and maths are *part of the game rules* – not quizzes stuck on top.

## Vision

Kids drift to sites full of ads, timers and trackers because those games are fun. Lingua Play aims to be just as fun, while quietly practising vocabulary, directions, counting, addition/subtraction and coordinates. If a child notices they are "learning", we have designed it wrong.

## Run it

Requires Node.js 22.22.2+, 24.15.0+, or 26.0.0+.

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests (Vitest)
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

## The games (and where the learning hides)

| Game | Play loop | Hidden learning |
| --- | --- | --- |
| **Market Quest** 🛒 | Customers ask for goods in Spanish or English; you fill the bag from the stall, take their bill (and coupons!) and hand back change. Five customers make a market day; you earn a sticker for each happy customer. | **Language:** product names, number words (*tres manzanas*), and quantifiers (*un par de*, *media docena*, *el doble de*) are the only way to know what to sell. **Maths:** totals are never shown – you multiply prices, apply coupons on later customers, and subtract from the bill. Mistakes have silly consequences, never a red cross. |
| **Compass Island** 🧭 | Read a treasure-map clue, sail around rocks on a `7 × 7` sea with a limited number of wind gusts (catching optional tailwinds 💨), then dig. Tap adjacent squares, the D-pad or arrow keys. Five treasures make a voyage. | **Language:** the clue is the only source of the target, using *norte/sur/este/oeste* and number words. **Maths:** turn clues (relative steps, landmarks, coordinates, and combined coordinates + steps) into routes within a step budget. Wrong digs give funny junk plus *frío / tibio / caliente* and warmer/colder hints. |
| **Color Chameleon** 🎨 | A chameleon asks to be painted a colour (sometimes with playful riddles!). Tap paint pots into the mixing bowl and watch it change instantly; the right mix finishes it. Five chameleons make a round that ends in a little gallery. | **Language:** colour names and similes (*verde como una rana*), plus live colour feedback as you experiment. **Colour mixing:** rounds progress naturally from primaries and secondaries to tints, shades, and three-pot mixes (lavender, mint, dark green, brown). |
| **Recipe Lab** 🍳 | Hungry animal friends request wacky dishes. Pick the ingredients, fill the visual measuring jug with `¼`, `½` and `1`-cup scoops, and finish with the requested cooking verb (*corta / mezcla / hornea / enfría*). | **Language:** food vocabulary, cooking imperative verbs, and fraction words (*un cuarto*, *media taza*, *tres cuartos*). **Maths:** adding unit fractions (`¼ + ½ = ¾`) and doubling recipes (`× 2`) later in the round. |
| **Train Station** 🚂 | Travellers tell you when their train leaves (or arrives). Turn the station's interactive analog clock hands and dispatch the train on time. | **Language:** natural Spanish & English time-telling (*y cuarto*, *y media*, *menos cuarto*, *quarter past/to*). **Maths:** reading an analog clock, working up to 5-minute intervals, delays, trip durations, and early arrival times. |
| **Mystery Detective** 🔎 | Inspector Parrot presents 4–6 animal suspects and a set of clues. Rule out suspects who don't fit the clues and accuse the culprit. Five cases make a shift. | **Language:** negation (*no lleva gafas*), clothing/snack vocabulary, habitats, and comparisons (*mayor que*, *par/impar*). **Logic & Maths:** boolean set elimination, even/odd numbers, and inequality comparisons. |

Every game shows the clue in the chosen primary language; a 🦜 *Translate* button reveals the other language at no penalty. Instead of a manual age selector, each 5-step round gently ramps up from straightforward warm-ups to cleverer multi-step puzzles for ages 8–12.

## Design principles

1. **Learning is the rule, not the question.** Progress requires using the language/maths, but it is never labelled as a test.
2. **Play first.** Each game should be fun even if you ignore the learning.
3. **Mistakes are funny, not scary.** No scores out of ten, no red crosses, no lives.
4. **No manipulation.** No streaks, daily rewards, countdown timers, push notifications or endless scrolling. Every session has a natural end.
5. **Stylised, not realistic.** Chunky outlines, flat sticker shadows, vibrant but calm palettes, one distinct world per game.
6. **Accessible by default.** Everything is reachable by keyboard, visible focus rings, text contrast of at least 4.5:1, bilingual labels for assistive tech, and `prefers-reduced-motion` switches off all animation.

## Design system

Tokens live in [`src/styles/tokens.css`](src/styles/tokens.css):

- **Colour:** `--ink`, `--paper`, `--sun`, `--berry`, `--coral`, `--leaf`, `--sea`, … (ink on sun/white and white on berry pass WCAG AA).
- **Typography:** rounded system font stack (no web-font requests) with scale `--text-xs` → `--text-hero`.
- **Spacing / radius / shadow:** `--space-1…7`, `--radius-sm…pill`, `--shadow-sm/md/lg` (flat "sticker" shadows).
- **Motion:** `--ease-pop`, `--dur`; small bobs and pops only.

Reusable components live in [`src/ui/components.ts`](src/ui/components.ts) (`Button`, `Card`, `Panel`, `biText`) and [`src/ui/gameShell.ts`](src/ui/gameShell.ts) (`GameHeader`, `StepDots`, `CharacterBubble`, `StatusBanner`, `EndCard`).

## Code layout

```
src/
  main.ts            hash router + header (language / age band)
  pages/             landing page + page types
  games/<game>/      logic.ts (pure, tested) + <game>.ts (UI)
  shared/            i18n, seeded RNG, localStorage progress
  ui/                DOM helper, design-system components
  styles/            tokens, base, components, game worlds
docs/ROADMAP.md
```

To add a game: create `src/games/<name>/`, export a `Page`, and register it in `routes` in `src/main.ts` and on the landing page.

## Privacy & safety

- No analytics, ads, cookies, accounts, or third-party scripts, fonts or images; a strict Content-Security-Policy in `index.html` blocks all network connections other than loading the site itself.
- Progress (language, age band, stickers, treasures) is stored **only** in your browser's `localStorage` under the key `linguaplay.v1`. It never leaves the device. The landing page has an *Erase my progress* button.
- No personal data is collected, no free-text input and no chat, so there is nothing to moderate.
- The UI is built with `textContent` / DOM APIs only (no `innerHTML`).

## Status

MVP prototype – see [`docs/ROADMAP.md`](docs/ROADMAP.md). Not yet tested with real children; that is the most important next step.

## License

MIT
