# Roadmap

## MVP scope (this release)

- Vite + TypeScript static site, no backend, no runtime dependencies.
- Design system: colour / typography / spacing / radius / shadow tokens; Button, Card, Panel components.
- Landing page with game entry, language (ES/EN) and age-band (7–10 / 11–14) switch, collection shelf and *Erase my progress*.
- **Market Quest** prototype: vocabulary + number words, totals, change.
- **Compass Island** prototype: directions, coordinates, distance, step budgets.
- Local-only progress in `localStorage`.
- Accessibility baseline: keyboard use, visible focus, AA contrast, reduced-motion, skip link, live-region feedback.
- Unit tests for game logic and storage.

## How learning hides in the loops

**Market Quest**
- *Loop:* listen to order → pick goods → receive bill → give change → get sticker.
- *Hidden objectives:* food vocabulary, plurals, number words (ES/EN); multiplication/addition of totals; subtraction for change. The total is never displayed.

**Compass Island**
- *Loop:* read clue → locate treasure → sail with limited wind → dig → get hot/cold hint.
- *Hidden objectives:* cardinal directions and number words (ES/EN); coordinates; counting steps; Manhattan distance and route planning around obstacles; comparatives via *frío/tibio/caliente*.

## Next milestones

1. **Playtest with children** (7–14) and adjust difficulty, text length and rewards.
2. Audio: optional recorded Spanish/English pronunciation (self-hosted, no third-party services).
3. Third game (e.g. *Recipe Lab*: fractions and imperative verbs; or *Train Station*: clock reading and travel dialogues).
4. More content: bigger vocabulary packs, regional Spanish variants, new customers/landmarks.
5. PWA / offline support, still without tracking.
6. Parent/teacher view: export and import progress as a local file (no accounts).
7. Accessibility audit with a screen reader and switch devices; high-contrast theme; dyslexia-friendly font option.

## Age-band progression ideas

**Ages 7–10**
- Numbers up to ~20, addition/subtraction, simple multiplication (quantity × price).
- Concrete vocabulary (food, animals, directions), short sentences, bilingual hints always available.
- Smaller maps, one- or two-step clues, generous step budgets.

**Ages 11–14**
- Multi-step arithmetic, fractions, percentages (discounts, tax), unit prices, budgets.
- Richer language: past/future tense, conditionals, negotiation dialogues, reading short stories.
- Larger maps with multi-leg clues, tighter budgets, negative coordinates, scale and distance, optional strategy puzzles.

## Non-goals

Backend services, accounts/login, online multiplayer, monetisation, and engagement tricks (streaks, daily rewards, timers).
