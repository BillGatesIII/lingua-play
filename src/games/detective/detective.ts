import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { createGameDirector } from '../../shared/speechDirector';
import { updateProgress } from '../../shared/storage';
import { addHoverVoice, speakEnglish } from '../../shared/voice';
import type { Page } from '../../pages/types';
import { Button, Panel, SpeakButton } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  CASES_PER_ROUND, HATS, SNACKS, caseBriefing, generateCase, predicateText,
  wrongAccusationAlibi, type CaseFile, type Suspect,
} from './logic';

export const detectivePage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x3c6ef372) >>> 0);
  const director = createGameDirector(rng);
  let index = 0;
  let current: CaseFile = generateCase(rng, index);
  let cleared = new Set<string>();
  let solved = false;
  let closed = false;
  let message: string | null = null;
  const badges: string[] = [];

  const host = h('div', { class: 'world world--detective' });
  ctx.root.append(host);

  const say = (m: string | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function toggleCleared(id: string) {
    if (solved || closed) return;
    const next = new Set(cleared);
    const rulingOut = !next.has(id);
    if (rulingOut) next.add(id);
    else next.delete(id);
    cleared = next;
    playSfx(rulingOut ? 'remove' : 'pop');
    say(null);
  }

  function accuse(s: Suspect, anchor?: HTMLElement) {
    if (solved || closed) return;
    if (s.id === current.culpritId) {
      solved = true;
      const prize = current.mystery.emoji;
      badges.push(prize);
      updateProgress((p) => {
        p.detective.solved += 1;
        if (!p.detective.badges.includes(prize)) p.detective.badges.push(prize);
      });
      playSfx('surprise');
      speakEnglish(director.celebrate(director.pickLine('solved-case', [
        `Case cracked! It was ${s.name}!`,
        `Elementary! It was ${s.name}!`,
        `Gotcha! It was ${s.name}!`,
        `Mystery solved! ${s.name} did it!`,
      ])), { anchor, mode: 'event' });
      say(`🔎 ¡Caso resuelto! ¡Fue ${s.name} (${s.animal.name.es})! Ganas la insignia ${prize}`, 'next-case');
    } else {
      const next = new Set(cleared);
      next.add(s.id);
      cleared = next;
      const alibi = wrongAccusationAlibi(s, rng);
      playSfx('oops');
      const line = director.encourage('Check every clue and rule out who does not match!', alibi.en);
      speakEnglish(line, { anchor, mode: 'event' });
      say(alibi.es);
    }
  }

  function nextCase() {
    index++;
    director.nextPuzzle();
    if (index >= CASES_PER_ROUND) {
      closed = true;
      completeGameRound();
      playSfx('levelUp');
      speakEnglish(director.pickLine('detective-end', [
        'All mysteries solved! Great detective work!',
        'Splendid sleuthing! Every case is closed!',
        'Brilliant detective! Not a single clue missed!',
        'Casebook complete! Jolly good work!',
      ]), { mode: 'event' });
    } else {
      current = generateCase(rng, index);
      cleared = new Set();
      solved = false;
      playSfx('step');
      const intro = director.transition('next-case', [
        current.mystery.prompt.en,
        `New mystery! ${current.mystery.prompt.en}`,
      ], 3);
      if (intro) speakEnglish(intro, { mode: 'event' });
    }
    message = null;
    draw(closed ? 'another-casebook' : `clear-${current.suspects[0].id}`);
  }

  function suspectCard(s: Suspect): HTMLElement {
    const isCleared = cleared.has(s.id);
    const isCulprit = solved && s.id === current.culpritId;
    const hat = HATS[s.hat];
    const snack = SNACKS[s.snack];
    const habitatIcon = s.animal.habitat === 'water' ? '🌊' : '🌿';
    const traits: { es: string; en: string }[] = [
      ...(hat.emoji ? [{ es: `${hat.emoji} ${hat.name.es}`, en: hat.name.en }] : []),
      ...(s.glasses ? [{ es: '👓 gafas', en: 'glasses' }] : []),
      { es: `${snack.emoji} ${snack.es}`, en: snack.en },
      { es: `${habitatIcon} ${s.animal.name.es}`, en: s.animal.name.en },
    ];

    const avatar = addHoverVoice(
      h('span', { class: 'suspect-card__avatar', 'aria-hidden': 'true' },
        s.animal.emoji,
        hat.emoji ? h('span', { class: 'suspect-card__hat' }, hat.emoji) : null,
        s.glasses ? h('span', { class: 'suspect-card__glasses' }, '👓') : null),
      `${s.name}, the ${s.animal.name.en}`,
    );

    return h('article', {
      class: `suspect-card ${isCleared ? 'suspect-card--cleared' : ''} ${isCulprit ? 'suspect-card--culprit' : ''}`.trim(),
    },
    h('div', { class: 'suspect-card__top' },
      h('span', { class: 'suspect-card__badge' }, `#${s.badge}`),
      avatar),
    h('h3', { class: 'suspect-card__name' }, s.name, isCleared ? ' 😴' : ''),
    h('ul', { class: 'suspect-card__traits' }, ...traits.map((t) =>
      h('li', {}, SpeakButton(t.es, {
        english: t.en,
        className: 'suspect-card__trait-btn',
        ariaLabel: `${t.es} (${t.en})`,
      })))),
    h('div', { class: 'suspect-card__actions' },
      Button(
        isCleared ? 'Volver' : 'Descartar',
        {
          variant: 'ghost',
          className: 'btn--mini',
          disabled: solved,
          pressed: isCleared,
          focusKey: `clear-${s.id}`,
          ariaLabel: `Descartar a ${s.name}`,
          voiceHover: isCleared ? 'Undo' : 'Rule out',
          onClick: () => toggleCleared(s.id),
        },
      ),
      Button('🔎 ¡Es!', {
        variant: 'primary',
        className: 'btn--mini',
        disabled: solved || isCleared,
        focusKey: `accuse-${s.id}`,
        ariaLabel: `Acusar a ${s.name}`,
        voiceHover: `Accuse ${s.name}`,
        onClick: (e) => accuse(s, e.currentTarget as HTMLElement),
      })));
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🔎 Mystery Detective',
        noun: 'Caso',
        index, total: CASES_PER_ROUND,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'lemon',
          title: '¡Todos los misterios resueltos! 🕵️',
          art: h('p', { class: 'big-emoji', 'aria-label': 'insignias' }, badges.join(' ')),
          body: '¡Ningún enigma se le escapa a la agencia Lupa!',
          againLabel: 'Más misterios',
          againVoice: 'More mysteries',
          againFocusKey: 'another-casebook',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
        }));
        return wrap;
      }

      const clueList = h('ul', { class: 'clue-list' }, ...current.clues.map((c) => {
        const es = predicateText(c, 'es');
        const en = predicateText(c, 'en');
        return h('li', {}, SpeakButton(`🔎 ${es}`, {
          english: en,
          className: 'clue-btn',
          lang: 'es',
          ariaLabel: `${es} (escuchar en inglés)`,
        }));
      }));

      append(wrap, [
        CharacterBubble({
          emoji: '🦜',
          mood: solved ? current.mystery.emoji : '🔎',
          name: 'Inspector Loro',
          englishName: 'Inspector Parrot',
          text: caseBriefing(current, 'es'),
          englishText: caseBriefing(current, 'en'),
        }),
        h('div', { class: 'detective-work' },
          Panel('📋 Pistas del caso', [
            clueList,
            h('p', { class: 'muted' }, 'Descarta a quienes no cumplan las pistas y acusa al culpable.'),
          ]),
          h('div', { class: 'suspects' }, ...current.suspects.map(suspectCard))),
        StatusBanner(message),
        solved
          ? Button('Siguiente caso →', {
              onClick: nextCase,
              large: true,
              focusKey: 'next-case',
              voiceHover: 'Next case',
            })
          : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
};
