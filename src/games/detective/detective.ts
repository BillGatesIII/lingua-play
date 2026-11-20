import { other, tr, type Bi } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32 } from '../../shared/rng';
import { updateProgress } from '../../shared/storage';
import type { Page } from '../../pages/types';
import { Button, Panel } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  CASES_PER_ROUND, HATS, SNACKS, caseBriefing, generateCase, predicateText,
  wrongAccusationAlibi, type CaseFile, type Suspect,
} from './logic';

export const detectivePage: Page = (ctx) => {
  let { lang } = ctx;
  const rng = mulberry32((Date.now() ^ 0x3c6ef372) >>> 0);
  let index = 0;
  let current: CaseFile = generateCase(rng, index);
  let cleared = new Set<string>();
  let solved = false;
  let closed = false;
  let translate = false;
  let message: Bi | null = null;
  const badges: string[] = [];

  const host = h('div', { class: 'world world--detective' });
  ctx.root.append(host);

  const say = (m: Bi | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function toggleCleared(id: string) {
    if (solved || closed) return;
    const next = new Set(cleared);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    cleared = next;
    say(null);
  }

  function accuse(s: Suspect) {
    if (solved || closed) return;
    if (s.id === current.culpritId) {
      solved = true;
      const prize = current.mystery.emoji;
      badges.push(prize);
      updateProgress((p) => {
        p.detective.solved += 1;
        if (!p.detective.badges.includes(prize)) p.detective.badges.push(prize);
      });
      say({
        es: `🔎 ¡Caso resuelto! ¡Fue ${s.name} (${s.animal.name.es})! Ganas la insignia ${prize}`,
        en: `🔎 Case solved! It was ${s.name} (the ${s.animal.name.en})! You earned ${prize}`,
      }, 'next-case');
    } else {
      const next = new Set(cleared);
      next.add(s.id);
      cleared = next;
      say(wrongAccusationAlibi(s, rng));
    }
  }

  function nextCase() {
    index++;
    if (index >= CASES_PER_ROUND) {
      closed = true;
      completeGameRound();
    } else {
      current = generateCase(rng, index);
      cleared = new Set();
      solved = false;
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
    const traits = [
      hat.emoji ? `${hat.emoji} ${hat.name[lang]}` : null,
      s.glasses ? `👓 ${tr({ es: 'gafas', en: 'glasses' }, lang)}` : null,
      `${snack.emoji} ${snack[lang]}`,
      `${habitatIcon} ${tr(s.animal.name, lang)}`,
    ].filter((x): x is string => Boolean(x));

    return h('article', {
      class: `suspect-card ${isCleared ? 'suspect-card--cleared' : ''} ${isCulprit ? 'suspect-card--culprit' : ''}`.trim(),
    },
    h('div', { class: 'suspect-card__top' },
      h('span', { class: 'suspect-card__badge' }, `#${s.badge}`),
      h('span', { class: 'suspect-card__avatar', 'aria-hidden': 'true' },
        s.animal.emoji,
        hat.emoji ? h('span', { class: 'suspect-card__hat' }, hat.emoji) : null,
        s.glasses ? h('span', { class: 'suspect-card__glasses' }, '👓') : null)),
    h('h3', { class: 'suspect-card__name' }, s.name, isCleared ? ' 😴' : ''),
    h('ul', { class: 'suspect-card__traits' }, ...traits.map((t) => h('li', {}, t))),
    h('div', { class: 'suspect-card__actions' },
      Button(
        isCleared
          ? tr({ es: 'Volver', en: 'Undo' }, lang)
          : tr({ es: 'Descartar', en: 'Rule out' }, lang),
        {
          variant: 'ghost',
          className: 'btn--mini',
          disabled: solved,
          pressed: isCleared,
          focusKey: `clear-${s.id}`,
          ariaLabel: `${tr({ es: 'Descartar a', en: 'Rule out' }, lang)} ${s.name}`,
          onClick: () => toggleCleared(s.id),
        },
      ),
      Button(`🔎 ${tr({ es: '¡Es!', en: 'Accuse' }, lang)}`, {
        variant: 'primary',
        className: 'btn--mini',
        disabled: solved || isCleared,
        focusKey: `accuse-${s.id}`,
        ariaLabel: `${tr({ es: 'Acusar a', en: 'Accuse' }, lang)} ${s.name}`,
        onClick: () => accuse(s),
      })));
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🔎 Mystery Detective',
        noun: { es: 'Caso', en: 'Case' },
        index, total: CASES_PER_ROUND, lang,
      }));

      if (closed) {
        wrap.append(EndCard({
          tone: 'lemon',
          title: { es: '¡Todos los misterios resueltos! 🕵️', en: 'All mysteries solved! 🕵️' },
          art: h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'insignias', en: 'badges' }, lang) }, badges.join(' ')),
          body: { es: '¡Ningún enigma se le escapa a la agencia Lupa!', en: 'No mystery escapes the Detective Agency!' },
          againLabel: { es: 'Más misterios', en: 'More mysteries' },
          againFocusKey: 'another-casebook',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
          lang,
        }));
        return wrap;
      }

      const clueList = h('ul', { class: 'clue-list' }, ...current.clues.map((c) =>
        h('li', {},
          h('span', { lang }, `🔎 ${predicateText(c, lang)}`),
          translate ? h('span', { class: 'clue-list__sub', lang: other(lang) }, ` (${predicateText(c, other(lang))})`) : null)));

      append(wrap, [
        CharacterBubble({
          emoji: '🦜',
          mood: solved ? current.mystery.emoji : '🔎',
          name: tr({ es: 'Inspector Loro', en: 'Inspector Parrot' }, lang),
          text: caseBriefing(current, lang),
          subText: caseBriefing(current, other(lang)),
          showSub: translate,
          lang,
          translatePressed: translate,
          onTranslate: () => { translate = !translate; draw(); },
        }),
        h('div', { class: 'detective-work' },
          Panel(`📋 ${tr({ es: 'Pistas del caso', en: 'Case clues' }, lang)}`, [
            clueList,
            h('p', { class: 'muted' }, tr({ es: 'Descarta a quienes no cumplan las pistas y acusa al culpable.', en: 'Rule out suspects who do not fit the clues, then accuse the culprit.' }, lang)),
          ]),
          h('div', { class: 'suspects' }, ...current.suspects.map(suspectCard))),
        StatusBanner(message, lang),
        solved ? Button(tr({ es: 'Siguiente caso →', en: 'Next case →' }, lang), { onClick: nextCase, large: true, focusKey: 'next-case' }) : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
  return Object.assign(() => undefined, {
    updateSettings(nextLang: typeof lang) {
      lang = nextLang;
      draw();
    },
  });
};
