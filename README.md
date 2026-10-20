# 🦜 Lingua Play

Ad-free, tracker-free Spanish/English games for kids aged 7–14, where the language and maths are *part of the game rules* – not quizzes stuck on top.

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
| **Market Quest** 🛒 | Customers ask for goods in Spanish or English; you fill the bag from the stall, take their bill and hand back change. Five customers make a market day; you earn a sticker for each happy customer. | **Language:** product names and number words (*tres manzanas*, *un queso*) are the only way to know what to sell. **Maths:** the total is never shown – prices sit on the stall signs, so you add up quantities × prices, then subtract from the bill to give the right change. Mistakes have silly consequences (a customer wears 8 bananas as a hat), never a red cross. |
| **Compass Island** 🧭 | Read a treasure-map clue, sail around rocks with a limited number of wind gusts, then dig. Five treasures make a voyage. | **Language:** the clue is the only source of the target, using *norte/sur/este/oeste* (north/south/east/west) and number words. **Maths:** you turn clues ("from the lighthouse, three steps west and two north", or "x = 5, y = 3") into coordinates, count steps and plan a route within a step budget. A wrong dig returns a funny object plus a *frío / tibio / caliente* hint, which teaches distance comparison. |
| **Color Chameleon** 🎨 | A chameleon asks to be painted a colour. Tap paint pots into the mixing bowl and watch it change instantly; the right mix finishes it. Five chameleons make a round that ends in a little gallery, and *Play again* is one tap away. Nothing is saved or scored. | **Language:** the colour is only given by name (*pinta el camaleón de morado*), and the live colour name of your mix teaches more names as you experiment. **Colour mixing:** red + yellow = orange, and so on; the game grows the palette and mixing options as the player masters simpler mixes. Wrong mixes are just another colour, never a mistake. |
| **Recipe Lab** 🥣 | Read a recipe in Spanish or English, add ingredients to the bowl, then stir. Four dishes make a cooking session. | **Language:** ingredient names, plurals and number words are built into each instruction. **Maths:** count the quantities, keep a running total and match recipes that adapt in ingredient count and quantity to the player's attempts. |
| **Word Workshop** 🔤 | Solve a short clue, arrange letter tiles into the matching Spanish or English word, and move on to the next puzzle. | **Language:** vocabulary and spelling are part of the puzzle, with optional translation for clues. The game adjusts word length and the number of distractor letters to the player's attempts. |
| **Number Garden** 🌷 | Read the garden instruction, spot how the flower counts change from bed to bed, then choose what grows next. Five patterns fill the garden. | **Language:** follow number and comparison instructions in Spanish or English. **Maths:** begin with addition patterns, then introduce multiplication and alternating sequences when the player is ready. |

Every game shows the clue in the chosen primary language; a 🦜 *Translate* button reveals the other language at no penalty. There are no age-group settings: all games start at a balanced level, then quietly add challenge after repeated easy rounds or simplify after repeated difficult rounds. This lets players aged 7–14 find their own pace without being labelled.

After ten minutes of visible gameplay, the app pauses and asks for an equal amount of screen-free time. Players can also choose an earlier break from the home page; the pause counts only while the app is out of view. It suggests simple offline activities instead of offering another reward or a reason to keep playing. Screen-time balance is stored only on the device.

## Design principles

1. **Learning is the rule, not the question.** Progress requires using the language/maths, but it is never labelled as a test.
2. **Play first.** Each game should be fun even if you ignore the learning.
3. **Mistakes are funny, not scary.** No scores out of ten, no red crosses, no lives.
4. **No manipulation.** No streaks, daily rewards, gameplay countdowns, push notifications or endless scrolling. Every session has a natural end; screen use is matched with an equal screen-free pause.
5. **Stylised, not realistic.** Chunky outlines, flat sticker shadows, vibrant but calm palettes, one distinct world per game.
6. **Accessible by default.** Everything is reachable by keyboard, visible focus rings, text contrast of at least 4.5:1, bilingual labels for assistive tech, and `prefers-reduced-motion` switches off all animation.

## Design system

Tokens live in [`src/styles/tokens.css`](src/styles/tokens.css):

- **Colour:** `--ink`, `--paper`, `--sun`, `--berry`, `--coral`, `--leaf`, `--sea`, … (ink on sun/white and white on berry pass WCAG AA).
- **Typography:** rounded system font stack (no web-font requests) with scale `--text-xs` → `--text-hero`.
- **Spacing / radius / shadow:** `--space-1…7`, `--radius-sm…pill`, `--shadow-sm/md/lg` (flat "sticker" shadows).
- **Motion:** `--ease-pop`, `--dur`; small bobs and pops only.

Reusable components are in [`src/ui/components.ts`](src/ui/components.ts): `Button` (primary / secondary / ghost), `Card` (sun / sea / berry / leaf / plain), `Panel`, and `biText` for primary-plus-secondary language text.

## Code layout

```
src/
  main.ts            hash router + header (language / screen-free balance)
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
- Progress (language, stickers, treasures) is stored **only** in your browser's `localStorage` under the key `linguaplay.v1`. Screen-time balance is stored separately on the device. Nothing leaves the device. The landing page has an *Erase my game progress* button.
- No personal data is collected, no free-text input and no chat, so there is nothing to moderate.
- The UI is built with `textContent` / DOM APIs only (no `innerHTML`).

## Status

MVP prototype – see [`docs/ROADMAP.md`](docs/ROADMAP.md). Not yet tested with real children; that is the most important next step.

## License

MIT
