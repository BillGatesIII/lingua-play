import { other, tr, type Bi } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { updateProgress } from '../../shared/storage';
import type { Page } from '../../pages/types';
import { Button, Panel, biText } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  WORD_ROUND_LENGTH, generateWordPuzzle, isWordSolved, selectedWord, wordLetterCount, wordMistake,
  type WordPuzzle,
} from './logic';

export const wordsPage: Page = (ctx) => {
  let { lang } = ctx;
  const rng = mulberry32((Date.now() ^ 0x94d049bb) >>> 0);
  let index = 0;
  let usedEmojis: string[] = [];
  let puzzle: WordPuzzle = generateWordPuzzle(rng, index, lang, usedEmojis);
  let selected: number[] = [];
  let solved = false;
  let closed = false;
  let translate = false;
  let message: Bi | null = null;
  const solvedWords: string[] = [];
  const host = h('div', { class: 'world world--words' });
  ctx.root.append(host);

  function selectTile(id: number) {
    if (solved || closed) return;
    if (!selected.includes(id) && selected.length < wordLetterCount(puzzle, lang)) {
      selected = [...selected, id];
      message = null;
      const full = selected.length === wordLetterCount(puzzle, lang);
      const nextTile = puzzle.tiles.find((tile) => !selected.includes(tile.id));
      draw(full ? 'check-word' : nextTile ? `tile-${nextTile.id}` : undefined);
    }
  }

  function removeTile(id: number) {
    if (solved || closed) return;
    selected = selected.filter((tileId) => tileId !== id);
    message = null;
    draw(`tile-${id}`);
  }

  function checkWord() {
    if (solved || closed) return;
    if (isWordSolved(puzzle, selected, lang)) {
      solved = true;
      usedEmojis = [...usedEmojis, puzzle.emoji];
      solvedWords.push(`${puzzle.emoji} ${puzzle.answer[lang]}`);
      updateProgress((p) => {
        p.words.solved += 1;
        if (!p.words.badges.includes(puzzle.emoji)) p.words.badges.push(puzzle.emoji);
      });
      message = { es: '¡Palabra encontrada! 🎉', en: 'Word found! 🎉' };
    } else {
      message = wordMistake(selectedWord(puzzle, selected), rng);
    }
    draw(solved ? 'next-word' : undefined);
  }

  function next() {
    index++;
    if (index >= WORD_ROUND_LENGTH) {
      closed = true;
      completeGameRound();
    } else {
      puzzle = generateWordPuzzle(rng, index, lang, usedEmojis);
      selected = [];
      solved = false;
    }
    message = null;
    draw(closed ? 'play-again' : `tile-${puzzle.tiles[0].id}`);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || solved || closed) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Backspace' && selected.length > 0) {
      e.preventDefault();
      removeTile(selected[selected.length - 1]);
      return;
    }
    if (e.key === 'Enter' && selected.length === wordLetterCount(puzzle, lang)) {
      e.preventDefault();
      checkWord();
      return;
    }
    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
      const ch = e.key.toLowerCase();
      const match = puzzle.tiles.find((t) => !selected.includes(t.id) && t.letter.toLowerCase() === ch);
      if (match) {
        e.preventDefault();
        selectTile(match.id);
      }
    }
  };
  document.addEventListener('keydown', onKey);

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🔤 Word Workshop',
        noun: { es: 'Palabra', en: 'Word' },
        index, total: WORD_ROUND_LENGTH, lang,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'sea',
          title: { es: '¡Taller de palabras terminado! ✨', en: 'Word workshop complete! ✨' },
          art: h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'palabras encontradas', en: 'words found' }, lang) }, solvedWords.join(' · ')),
          body: { es: '¡Buen trabajo con esas letras! Vuelve cuando quieras.', en: 'Great work with those letters! Come back whenever you like.' },
          againLabel: { es: 'Otra vez', en: 'Play again' },
          againFocusKey: 'play-again',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
          lang,
        }));
        return wrap;
      }

      const targetLen = wordLetterCount(puzzle, lang);
      const answer = selectedWord(puzzle, selected);
      const slots = Array.from({ length: targetLen }, (_, slotIdx) => {
        const tileId = selected[slotIdx];
        if (tileId === undefined) {
          return h('span', { class: 'letter-slot letter-slot--empty', 'aria-hidden': 'true' }, '_');
        }
        const tile = puzzle.tiles.find((t) => t.id === tileId)!;
        return Button(tile.letter.toUpperCase(), {
          variant: 'ghost', className: 'letter-tile letter-tile--selected', disabled: solved,
          focusKey: `slot-${slotIdx}`,
          ariaLabel: `${tr({ es: 'Quitar letra', en: 'Remove letter' }, lang)} ${tile.letter}`,
          onClick: () => removeTile(tileId),
        });
      });

      const tiles = puzzle.tiles.map((tile) => Button(tile.letter.toUpperCase(), {
        variant: 'secondary', className: 'letter-tile',
        disabled: solved || selected.includes(tile.id) || selected.length >= targetLen,
        focusKey: `tile-${tile.id}`,
        ariaLabel: `${tr({ es: 'Letra', en: 'Letter' }, lang)} ${tile.letter}`,
        onClick: () => selectTile(tile.id),
      }));

      append(wrap, [
        CharacterBubble({
          emoji: '🦉',
          mood: solved ? puzzle.emoji : undefined,
          name: tr({ es: 'Berta el búho', en: 'Berta the owl' }, lang),
          text: puzzle.clue[lang],
          subText: puzzle.clue[other(lang)],
          showSub: translate,
          lang,
          translatePressed: translate,
          onTranslate: () => { translate = !translate; draw(); },
        }),
        h('div', { class: 'cols cols--map' },
          Panel(`🧩 ${tr({ es: 'Dibujo secreto', en: 'Mystery picture' }, lang)}`, [
            h('div', { class: 'word-picture', role: 'img', 'aria-label': `${puzzle.emoji} ${puzzle.clue[lang]}` }, puzzle.emoji),
            h('p', { class: 'muted' }, `${targetLen} ${tr({ es: 'letras', en: 'letters' }, lang)}`),
          ]),
          Panel(`🔠 ${tr({ es: 'Forma la palabra', en: 'Build the word' }, lang)}`, [
            h('div', {
              class: 'word-answer',
              'aria-live': 'polite',
              'data-live': 'answer',
              'aria-label': answer || tr({ es: 'Ninguna letra seleccionada', en: 'No letters selected' }, lang),
            }, ...slots),
            h('div', { class: 'letter-rack' }, ...tiles),
            h('p', { class: 'muted' }, tr({ es: 'Toca las letras o escríbelas con el teclado.', en: 'Tap the letters or type them on your keyboard.' }, lang)),
            solved
              ? null
              : Button(biText({ es: '¡Comprobar!', en: 'Check!' }, lang), {
                  onClick: checkWord,
                  disabled: selected.length !== targetLen,
                  large: true,
                  focusKey: 'check-word',
                }),
          ])),
        StatusBanner(message, lang),
        solved ? Button(tr({ es: 'Siguiente palabra →', en: 'Next word →' }, lang), { onClick: next, large: true, focusKey: 'next-word' }) : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
  return Object.assign(() => document.removeEventListener('keydown', onKey), {
    updateSettings(nextLang: typeof lang) {
      if (lang === nextLang) return;
      lang = nextLang;
      index = 0;
      usedEmojis = [];
      puzzle = generateWordPuzzle(rng, index, lang, usedEmojis);
      selected = [];
      solved = false;
      closed = false;
      message = null;
      solvedWords.length = 0;
      draw();
    },
  });
};
