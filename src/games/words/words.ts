import type { Bi } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { updateProgress } from '../../shared/storage';
import { addHoverVoice, speakEnglish } from '../../shared/voice';
import type { Page } from '../../pages/types';
import { Button, Panel } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  WORD_ROUND_LENGTH, generateWordPuzzle, isWordSolved, selectedWord, wordLetterCount, wordMistake,
  type WordPuzzle,
} from './logic';

export const wordsPage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x94d049bb) >>> 0);
  let index = 0;
  let usedEmojis: string[] = [];
  let puzzle: WordPuzzle = generateWordPuzzle(rng, index, 'es', usedEmojis);
  let selected: number[] = [];
  let solved = false;
  let closed = false;
  let endCelebrated = false;
  let message: Bi | null = null;
  const solvedWords: string[] = [];
  const host = h('div', { class: 'world world--words' });
  ctx.root.append(host);

  function selectTile(id: number) {
    if (solved || closed) return;
    if (!selected.includes(id) && selected.length < wordLetterCount(puzzle, 'es')) {
      selected = [...selected, id];
      message = null;
      playSfx('pop');
      const full = selected.length === wordLetterCount(puzzle, 'es');
      const nextTile = puzzle.tiles.find((tile) => !selected.includes(tile.id));
      draw(full ? 'check-word' : nextTile ? `tile-${nextTile.id}` : undefined);
    }
  }

  function removeTile(id: number) {
    if (solved || closed) return;
    selected = selected.filter((tileId) => tileId !== id);
    message = null;
    playSfx('remove');
    draw(`tile-${id}`);
  }

  function checkWord(anchor?: HTMLElement) {
    if (solved || closed) return;
    if (isWordSolved(puzzle, selected, 'es')) {
      solved = true;
      usedEmojis = [...usedEmojis, puzzle.emoji];
      solvedWords.push(`${puzzle.emoji} ${puzzle.answer.es}`);
      updateProgress((p) => {
        p.words.solved += 1;
        if (!p.words.badges.includes(puzzle.emoji)) p.words.badges.push(puzzle.emoji);
      });
      playSfx('surprise');
      speakEnglish(`${puzzle.answer.en}! Great job!`, { anchor, mode: 'click' });
      message = { es: '¡Palabra encontrada! 🎉', en: 'Word found! 🎉' };
    } else {
      playSfx('oops');
      speakEnglish('Almost! Try again!', { anchor, mode: 'click' });
      message = wordMistake(selectedWord(puzzle, selected), rng);
    }
    draw(solved ? 'next-word' : undefined);
  }

  function next() {
    index++;
    if (index >= WORD_ROUND_LENGTH) {
      closed = true;
      completeGameRound();
      if (!endCelebrated) {
        endCelebrated = true;
        playSfx('levelUp');
      }
      speakEnglish('Word workshop complete! Great work!');
    } else {
      puzzle = generateWordPuzzle(rng, index, 'es', usedEmojis);
      selected = [];
      solved = false;
      playSfx('step');
      speakEnglish(puzzle.answer.en);
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
    if (e.key === 'Enter' && selected.length === wordLetterCount(puzzle, 'es')) {
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
        index, total: WORD_ROUND_LENGTH,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'sea',
          title: { es: '¡Taller de palabras terminado! ✨', en: 'Word workshop complete! ✨' },
          art: h('p', { class: 'big-emoji', 'aria-label': 'palabras encontradas' }, solvedWords.join(' · ')),
          body: { es: '¡Buen trabajo con esas letras! Vuelve cuando quieras.', en: 'Great work with those letters! Come back whenever you like.' },
          againLabel: { es: 'Otra vez', en: 'Play again' },
          againFocusKey: 'play-again',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
        }));
        return wrap;
      }

      const targetLen = wordLetterCount(puzzle, 'es');
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
          ariaLabel: `Quitar letra ${tile.letter}`,
          voiceHover: tile.letter.toUpperCase(),
          onClick: () => removeTile(tileId),
        });
      });

      const tiles = puzzle.tiles.map((tile) => Button(tile.letter.toUpperCase(), {
        variant: 'secondary', className: 'letter-tile',
        disabled: solved || selected.includes(tile.id) || selected.length >= targetLen,
        focusKey: `tile-${tile.id}`,
        ariaLabel: `Letra ${tile.letter}`,
        voiceHover: tile.letter.toUpperCase(),
        onClick: () => selectTile(tile.id),
      }));

      const picBtn = addHoverVoice(
        h('button', {
          type: 'button',
          class: 'word-picture-btn',
          'aria-label': `${puzzle.emoji} ${puzzle.clue.es} (escuchar en inglés)`,
          onclick: (e: MouseEvent) => {
            playSfx('pop');
            speakEnglish(puzzle.answer.en, { anchor: e.currentTarget as HTMLElement, mode: 'click' });
          },
        }, puzzle.emoji),
        puzzle.answer.en,
      );

      append(wrap, [
        CharacterBubble({
          emoji: '🦉',
          mood: solved ? puzzle.emoji : undefined,
          name: 'Berta el búho',
          englishName: 'Berta the owl',
          text: puzzle.clue.es,
          englishText: puzzle.clue.en,
        }),
        h('div', { class: 'cols cols--map' },
          Panel('🧩 Dibujo secreto', [
            picBtn,
            h('p', { class: 'muted' }, `${targetLen} letras`),
          ]),
          Panel('🔠 Forma la palabra', [
            h('div', {
              class: 'word-answer',
              'aria-live': 'polite',
              'data-live': 'answer',
              'aria-label': answer || 'Ninguna letra seleccionada',
            }, ...slots),
            h('div', { class: 'letter-rack' }, ...tiles),
            h('p', { class: 'muted' }, 'Toca las letras o escríbelas con el teclado.'),
            solved
              ? null
              : Button('¡Comprobar!', {
                  onClick: (e) => checkWord(e.currentTarget as HTMLElement),
                  disabled: selected.length !== targetLen,
                  large: true,
                  focusKey: 'check-word',
                  voiceHover: 'Check!',
                }),
          ])),
        StatusBanner(message),
        solved
          ? Button('Siguiente palabra →', {
              onClick: next,
              large: true,
              focusKey: 'next-word',
              voiceHover: 'Next word',
            })
          : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
  return () => document.removeEventListener('keydown', onKey);
};
