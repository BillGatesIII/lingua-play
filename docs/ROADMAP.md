# Roadmap

## MVP scope (this release)

- Vite + TypeScript static site, no backend, no runtime dependencies.
- Design system: colour / typography / spacing / radius / shadow tokens; Button, Card, Panel components.
- Landing page with game entry, language (ES/EN) switch, collection shelf and *Erase my game progress*.
- Age-neutral adaptive difficulty (starts balanced; adjusts after repeated smooth or tricky rounds) and an equal-time screen-free pause.
- **Market Quest** prototype: vocabulary + number words, totals, change.
- **Compass Island** prototype: directions, coordinates, distance, step budgets.
- **Color Chameleon**, **Recipe Lab**, **Word Workshop**, and **Number Garden**: colour mixing, recipe quantities, vocabulary spelling, and number patterns.
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

1. **Playtest with children** (7–14) and adjust difficulty adaptation, text length and screen-free pause.
2. Audio: optional recorded Spanish/English pronunciation (self-hosted, no third-party services).
3. Playtest the expanded game collection, including more advanced recipe fractions and word puzzles.
4. More content: bigger vocabulary packs, regional Spanish variants, new customers/landmarks.
5. PWA / offline support, still without tracking.
6. Parent/teacher view: export and import progress as a local file (no accounts).
7. Accessibility audit with a screen reader and switch devices; high-contrast theme; dyslexia-friendly font option.

## Non-goals

Backend services, accounts/login, online multiplayer, monetisation, and engagement tricks (streaks, daily rewards, gameplay timers).
