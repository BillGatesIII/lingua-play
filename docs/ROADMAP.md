# Roadmap

## MVP scope (this release)

- Vite + TypeScript static site, no backend, no runtime dependencies.
- Design system: colour / typography / spacing / radius / shadow tokens; Button, SpeakButton, Card, Panel components.
- Spanish-first landing page with game entry, sound toggle (`🔊 Sonido / 🔇 Silencio`), interactive collection shelf with spoken English badges, and *Borrar mi progreso*.
- Spoken English pronunciation via browser `speechSynthesis`, floating 🦜 speech bubbles, and synthesized Web Audio sound effects.
- **Market Quest** prototype: vocabulary + number words, totals, change.
- **Compass Island** prototype: directions, coordinates, distance, step budgets.
- **Color Chameleon**, **Recipe Lab**, **Train Station**, **Mystery Detective**, **Word Workshop**, and **Bloom Garden**: colour mixing, recipe fractions, analog clock reading, boolean logic, vocabulary spelling, and number patterns.
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
2. ✅ Audio v1 live: browser `speechSynthesis` English pronunciation + speech bubbles + Web Audio SFX. Future: optional self-hosted recorded native Spanish/English audio clips.
3. ✅ Eight games live: **Market Quest**, **Compass Island**, **Color Chameleon**, **Recipe Lab**, **Train Station**, **Mystery Detective**, **Word Workshop**, and **Bloom Garden**, with a natural round-based outdoor break invitation after every two rounds.
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
