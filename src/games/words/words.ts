import { other, tr, type Bi } from '../../shared/i18n';
import { mulberry32 } from '../../shared/rng';
import type { Page } from '../../pages/types';
import { Button, Card, Panel, biText } from '../../ui/components';
import { h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { WORD_ROUND_LENGTH, generateWordPuzzle, isWordSolved, selectedWord, wordLetterCount, type WordPuzzle } from './logic';

export const wordsPage: Page = (ctx) => {
  let { lang, band } = ctx;
  const rng = mulberry32((Date.now() ^ 0x94d049bb) >>> 0);
  let index = 0;
  let puzzle: WordPuzzle = generateWordPuzzle(rng, band, lang);
  let selected: number[] = [];
  let solved = false;
  let closed = false;
  let translate = false;
  let message: Bi | null = null;
  const solvedWords: string[] = [];
  const host = h('div', { class: 'world world--words' });
  ctx.root.append(host);

  function selectTile(id: number) {
    if (!selected.includes(id) && selected.length < wordLetterCount(puzzle, lang)) {
      selected = [...selected, id];
      message = null;
      draw();
    }
  }

  function removeTile(id: number) {
    selected = selected.filter((tileId) => tileId !== id);
    message = null;
    draw(`tile-${id}`);
  }

  function checkWord() {
    if (isWordSolved(puzzle, selected, lang)) {
      solved = true;
      solvedWords.push(`${puzzle.emoji} ${puzzle.answer[lang]}`);
      message = { es: '¡Palabra encontrada! 🎉', en: 'Word found! 🎉' };
    } else {
      message = { es: '¡Casi! Cambia las letras y vuelve a probar.', en: 'Nearly! Rearrange the letters and try again.' };
    }
    draw(solved ? 'next-word' : undefined);
  }

  function next() {
    index++;
    if (index >= WORD_ROUND_LENGTH) closed = true;
    else {
      puzzle = generateWordPuzzle(rng, band, lang);
      selected = [];
      solved = false;
    }
    message = null;
    draw(closed ? 'play-again' : 'check-word');
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(h('header', { class: 'game__head' },
        h('div', {}, h('h1', { class: 'game__title' }, '🔤 Word Workshop'),
          h('p', { class: 'muted' }, `${tr({ es: 'Palabra', en: 'Word' }, lang)} ${Math.min(index + 1, WORD_ROUND_LENGTH)} / ${WORD_ROUND_LENGTH}`)),
        Button(`← ${tr({ es: 'Inicio', en: 'Home' }, lang)}`, { variant: 'ghost', href: '#/' })));

      if (closed) {
        wrap.append(Card([
          h('h2', {}, tr({ es: '¡Taller de palabras terminado! ✨', en: 'Word workshop complete! ✨' }, lang)),
          h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'palabras encontradas', en: 'words found' }, lang) }, solvedWords.join(' · ')),
          h('p', {}, tr({ es: '¡Buen trabajo con esas letras! Vuelve cuando quieras.', en: 'Great work with those letters! Come back whenever you like.' }, lang)),
          h('div', { class: 'row' },
            Button(tr({ es: 'Otra vez', en: 'Play again' }, lang), { onClick: () => ctx.refresh(), focusKey: 'play-again' }),
            Button(tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'secondary', href: '#/' })),
        ], 'sun', 'end-card'));
        return wrap;
      }

      const clue = puzzle.clue[lang];
      const answer = selectedWord(puzzle, selected);
      const tiles = puzzle.tiles.map((tile) => Button(tile.letter.toUpperCase(), {
        variant: 'secondary', className: 'letter-tile', disabled: solved || selected.includes(tile.id) || selected.length >= wordLetterCount(puzzle, lang),
        focusKey: `tile-${tile.id}`, ariaLabel: `${tr({ es: 'Letra', en: 'Letter' }, lang)} ${tile.letter}`,
        onClick: () => selectTile(tile.id),
      }));
      wrap.append(
        h('div', { class: 'cols cols--map' },
          Panel(`🧩 ${tr({ es: 'Pista', en: 'Clue' }, lang)}`, [
            h('div', { class: 'word-picture', role: 'img', 'aria-label': `${puzzle.emoji} ${clue}` }, puzzle.emoji),
            h('p', { class: 'clue', lang }, clue),
            translate ? h('p', { class: 'clue clue--sub', lang: other(lang) }, puzzle.clue[other(lang)]) : null,
            Button(`🦜 ${tr({ es: 'Traducir', en: 'Translate' }, lang)}`, { variant: 'ghost', pressed: translate, focusKey: 'translate', onClick: () => { translate = !translate; draw(); } }),
          ]),
          Panel(`🔠 ${tr({ es: 'Forma la palabra', en: 'Build the word' }, lang)}`, [
            h('div', { class: 'word-answer', 'aria-live': 'polite', 'aria-label': answer || tr({ es: 'Ninguna letra seleccionada', en: 'No letters selected' }, lang) },
              ...selected.map((id) => Button(puzzle.tiles.find((tile) => tile.id === id)!.letter.toUpperCase(), {
                variant: 'ghost', className: 'letter-tile letter-tile--selected', disabled: solved,
                ariaLabel: `${tr({ es: 'Quitar letra', en: 'Remove letter' }, lang)} ${puzzle.tiles.find((tile) => tile.id === id)!.letter}`,
                onClick: () => removeTile(id),
              }))),
            h('div', { class: 'letter-rack' }, ...tiles),
            h('p', { class: 'muted' }, `${selected.length} / ${wordLetterCount(puzzle, lang)} ${tr({ es: 'letras', en: 'letters' }, lang)}`),
            solved ? null : Button(biText({ es: '¡Listo!', en: 'Check!' }, lang), { onClick: checkWord, disabled: selected.length !== wordLetterCount(puzzle, lang), large: true, focusKey: 'check-word' }),
          ]),
        ),
        h('div', { class: `message ${message ? 'message--on' : ''}`, role: 'status', 'aria-live': 'polite' }, message ? biText(message, lang) : null),
        solved ? Button(tr({ es: 'Siguiente palabra →', en: 'Next word →' }, lang), { onClick: next, large: true, focusKey: 'next-word' }) : null,
      );
      return wrap;
    }, focusTarget);
  }

  draw();
  return Object.assign(() => undefined, {
    updateSettings(nextLang: typeof lang, nextBand: typeof band) {
      const languageChanged = lang !== nextLang;
      const bandChanged = band !== nextBand;
      lang = nextLang;
      band = nextBand;
      if (languageChanged || bandChanged) {
        if (bandChanged) index = 0;
        puzzle = generateWordPuzzle(rng, band, lang);
        selected = [];
        solved = false;
        closed = false;
        message = null;
        solvedWords.length = 0;
      }
      draw();
    },
  });
};
