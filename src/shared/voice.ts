import { h } from '../ui/dom';
import { decideSpeech, recordSpoken, type VoiceRole } from './speechDirector';
import { loadProgress } from './storage';

export type { VoiceRole };
export type SpeakMode = 'hover' | 'click' | 'event';

export interface SpeakOptions {
  anchor?: HTMLElement | null;
  mode?: SpeakMode;
  /** Semantic role controlling whether and how often audio plays. */
  role?: VoiceRole;
  /** Optional custom visual text in the bubble (defaults to `text`). */
  displayText?: string;
  /** Optional topic key for familiarity tracking (defaults to cleaned text). */
  topic?: string;
  /** Show the speech bubble visually without playing TTS audio. */
  silent?: boolean;
  /** Whether to display the floating speech bubble (defaults to true). */
  showBubble?: boolean;
  /** Debounce rapid step actions so TTS speaks the latest settled result once. */
  coalesceKey?: string;
  /** Custom coalesce settle delay in ms (defaults to 420ms). */
  coalesceMs?: number;
}

export interface HoverVoiceOptions {
  delayMs?: number;
  role?: VoiceRole;
  topic?: string;
  /** Whether to display the floating speech bubble on hover (defaults to true). */
  showBubble?: boolean;
}

const HOVER_DELAY_MS = 260;
const CHROME_HOVER_DELAY_MS = 320;
const STEP_COALESCE_MS = 420;
const SAME_TEXT_COOLDOWN_MS = 900;
const PRIORITY_GRACE_MS = 350;

let bubbleEl: HTMLElement | null = null;
let bubbleTextEl: HTMLElement | null = null;
let hideTimer: number | null = null;
let pendingHoverTimer: number | null = null;
let pendingCoalesceTimer: number | null = null;
let lastSpokenText = '';
let lastSpokenAt = 0;
let lastPriorityAt = 0;
let currentUtteranceId = 0;
let activePriorityUtteranceId: number | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let hookedSynth: SpeechSynthesis | null = null;

/** Removes emojis and extra whitespace so TTS reads natural English words cleanly. */
export function cleanSpeechText(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const synth = window.speechSynthesis;
  if (hookedSynth !== synth) {
    hookedSynth = synth;
    cachedVoices = [];
    try {
      synth.addEventListener?.('voiceschanged', () => {
        cachedVoices = synth.getVoices();
      });
    } catch {
      /* ignore */
    }
  }
  try {
    const list = synth.getVoices();
    if (list.length) cachedVoices = list;
  } catch {
    /* ignore */
  }
  return cachedVoices;
}

/** Triggers asynchronous browser voice loading early so British voices are ready on first tap. */
export function preloadVoices(): void {
  loadVoices();
}

const isBritish = (v: SpeechSynthesisVoice): boolean => /^en[-_]GB\b/i.test(v.lang);
const isAmerican = (v: SpeechSynthesisVoice): boolean => /^en[-_]US\b/i.test(v.lang);

export function pickEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  if (!english.length) return null;

  const british = english.filter(isBritish);
  if (british.length) {
    return (
      british.find((v) => /natural|neural|enhanced|premium/i.test(v.name))
      ?? british.find((v) => /google uk|libby|sonia|maisie|ryan|daniel|serena|kate|martha|arthur|oliver|stephanie/i.test(v.name))
      ?? british.find((v) => v.localService)
      ?? british[0]
    );
  }

  return (
    english.find((v) => /natural|neural|enhanced|premium|google us|samantha|aria|jenny|karen/i.test(v.name))
    ?? english.find((v) => isAmerican(v) && v.localService)
    ?? english.find(isAmerican)
    ?? english[0]
  );
}

function ensureBubble(): { root: HTMLElement; textEl: HTMLElement } | null {
  if (typeof document === 'undefined') return null;
  if (!bubbleEl || !bubbleEl.isConnected) {
    bubbleTextEl = h('span', { class: 'voice-bubble__text' });
    bubbleEl = h(
      'div',
      {
        class: 'voice-bubble',
        lang: 'en',
        'aria-live': 'off',
        hidden: true,
      },
      h('span', { class: 'voice-bubble__icon', 'aria-hidden': 'true' }, '🦜'),
      bubbleTextEl,
    );
    document.body.append(bubbleEl);
  }
  return { root: bubbleEl, textEl: bubbleTextEl! };
}

function positionBubble(bubble: HTMLElement, rect: DOMRect | null): void {
  bubble.classList.remove('voice-bubble--above', 'voice-bubble--below', 'voice-bubble--floating');
  if (!rect || (rect.width === 0 && rect.height === 0) || typeof window === 'undefined') {
    bubble.classList.add('voice-bubble--floating');
    bubble.style.left = '50%';
    bubble.style.top = '';
    bubble.style.setProperty('--tail-x', '50%');
    return;
  }

  const vw = window.innerWidth || 1024;
  const vh = window.innerHeight || 768;
  bubble.style.left = '0px';
  bubble.style.top = '0px';
  const bw = Math.min(bubble.offsetWidth || 240, vw - 24);
  const bh = bubble.offsetHeight || 52;
  const margin = 12;

  const anchorCenter = rect.left + rect.width / 2;
  const left = Math.max(margin, Math.min(vw - bw - margin, anchorCenter - bw / 2));
  const placeBelow = rect.top < bh + 18 && rect.bottom + bh + 18 < vh;
  const top = placeBelow
    ? Math.min(vh - bh - margin, rect.bottom + 10)
    : Math.max(margin, rect.top - bh - 10);

  const tailOffset = Math.max(18, Math.min(bw - 18, anchorCenter - left));
  bubble.classList.add(placeBelow ? 'voice-bubble--below' : 'voice-bubble--above');
  bubble.style.left = `${Math.round(left)}px`;
  bubble.style.top = `${Math.round(top)}px`;
  bubble.style.setProperty('--tail-x', `${Math.round(tailOffset)}px`);
}

function showBubble(displayText: string, anchorRect: DOMRect | null, durationMs: number): void {
  const parts = ensureBubble();
  if (!parts) return;
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  parts.textEl.textContent = displayText;
  parts.root.hidden = false;
  parts.root.classList.add('voice-bubble--visible');
  positionBubble(parts.root, anchorRect);

  hideTimer = window.setTimeout(() => {
    hideBubble();
  }, durationMs);
}

function isSynthBusy(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const synth = window.speechSynthesis;
  return Boolean(synth.speaking || synth.pending);
}

function isPrioritySpeechActive(): boolean {
  if (pendingCoalesceTimer !== null) return true;
  if (activePriorityUtteranceId === null) return false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    if (typeof synth.speaking === 'boolean' && typeof synth.pending === 'boolean') {
      return synth.speaking || synth.pending;
    }
  }
  return true;
}

export function hideBubble(): void {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (bubbleEl) {
    bubbleEl.classList.remove('voice-bubble--visible');
    bubbleEl.hidden = true;
  }
  if (activePriorityUtteranceId !== null && !isSynthBusy()) {
    activePriorityUtteranceId = null;
  }
}

export function stopSpeech(): void {
  cancelPendingHover();
  cancelPendingCoalesce();
  lastSpokenText = '';
  lastSpokenAt = 0;
  lastPriorityAt = 0;
  currentUtteranceId += 1;
  activePriorityUtteranceId = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
  hideBubble();
}

function speakUtterance(spoken: string, mode: SpeakMode, topic: string, withBubble = true): void {
  const soundOn = loadProgress().settings.sound;
  if (!soundOn || !spoken || typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return;
  }

  if (mode !== 'hover') {
    recordSpoken(topic, mode, Date.now());
  }
  const id = ++currentUtteranceId;
  activePriorityUtteranceId = mode === 'hover' ? null : id;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spoken);
    const voice = pickEnglishVoice(loadVoices());
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-GB';
    }
    utterance.rate = 0.92;
    utterance.pitch = 1.05;

    let started = false;
    let recorded = mode !== 'hover';
    const markSpoken = () => {
      if (recorded) return;
      recorded = true;
      recordSpoken(topic, mode, Date.now());
    };
    const scheduleShortHide = () => {
      if (activePriorityUtteranceId === id) activePriorityUtteranceId = null;
      if (!withBubble || id !== currentUtteranceId) return;
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (id === currentUtteranceId) hideBubble();
      }, 750);
    };
    utterance.onstart = () => {
      started = true;
      markSpoken();
    };
    utterance.onend = () => {
      markSpoken();
      scheduleShortHide();
    };
    utterance.onerror = () => {
      if (activePriorityUtteranceId === id) activePriorityUtteranceId = null;
      if (!started && id === currentUtteranceId && lastSpokenText === spoken) {
        lastSpokenText = '';
      }
      if (started) scheduleShortHide();
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    if (activePriorityUtteranceId === id) activePriorityUtteranceId = null;
    /* keep visual bubble even if speechSynthesis fails */
  }
}

export function speakEnglish(text: string, opts: SpeakOptions = {}): void {
  const mode = opts.mode ?? 'click';
  const role: VoiceRole = opts.role ?? (mode === 'hover' ? 'vocab' : mode === 'event' ? 'event' : 'explicit');
  const wantBubble = opts.showBubble !== false;
  const spoken = cleanSpeechText(text);
  const display = cleanSpeechText(opts.displayText ?? text) || text.trim();
  if (!spoken && !display) return;
  const topic = opts.topic ?? spoken;

  const now = Date.now();
  if (mode === 'hover') {
    if (spoken === lastSpokenText && now - lastSpokenAt < SAME_TEXT_COOLDOWN_MS) return;
    if (now - lastPriorityAt < PRIORITY_GRACE_MS || isPrioritySpeechActive()) return;
  } else {
    cancelPendingHover();
    lastPriorityAt = now;
    if (!opts.coalesceKey) cancelPendingCoalesce();
  }

  let anchorRect: DOMRect | null = null;
  if (wantBubble && opts.anchor && opts.anchor.isConnected) {
    anchorRect = opts.anchor.getBoundingClientRect();
  }

  const fallbackMs = Math.min(7000, Math.max(2000, display.length * 85));

  if (opts.coalesceKey && mode !== 'hover') {
    lastSpokenText = spoken;
    lastSpokenAt = now;
    if (wantBubble) showBubble(display, anchorRect, fallbackMs);
    cancelPendingCoalesce();
    if (opts.silent) return;
    pendingCoalesceTimer = window.setTimeout(() => {
      pendingCoalesceTimer = null;
      const settledAt = Date.now();
      const decision = decideSpeech({ role, mode, topic, now: settledAt });
      if (decision.speakAudio) {
        lastPriorityAt = settledAt;
        if (wantBubble) showBubble(display, anchorRect, fallbackMs);
        speakUtterance(spoken, mode, topic, wantBubble);
      }
    }, opts.coalesceMs ?? STEP_COALESCE_MS);
    return;
  }

  const decision = opts.silent
    ? { showBubble: wantBubble, speakAudio: false }
    : decideSpeech({ role, mode, topic, now });

  const shouldShowBubble = wantBubble && decision.showBubble;
  const shouldSpeak = decision.speakAudio;
  if (!shouldShowBubble && !shouldSpeak) return;

  lastSpokenText = spoken;
  lastSpokenAt = now;
  if (shouldShowBubble) showBubble(display, anchorRect, fallbackMs);

  if (!shouldSpeak) return;
  speakUtterance(spoken, mode, topic, shouldShowBubble);
}

export function cancelPendingHover(): void {
  if (pendingHoverTimer !== null) {
    window.clearTimeout(pendingHoverTimer);
    pendingHoverTimer = null;
  }
}

export function cancelPendingCoalesce(): void {
  if (pendingCoalesceTimer !== null) {
    window.clearTimeout(pendingCoalesceTimer);
    pendingCoalesceTimer = null;
  }
}

/** Attaches mouseover (pointerenter) English voice + speech bubble to an element. */
export function addHoverVoice<T extends HTMLElement>(
  el: T,
  textOrFn: string | (() => string),
  delayOrOpts: number | HoverVoiceOptions = HOVER_DELAY_MS,
): T {
  const opts: HoverVoiceOptions = typeof delayOrOpts === 'number'
    ? { delayMs: delayOrOpts }
    : delayOrOpts;
  const role: VoiceRole = opts.role ?? 'vocab';
  const delayMs = opts.delayMs ?? (role === 'chrome' ? CHROME_HOVER_DELAY_MS : HOVER_DELAY_MS);

  const onEnter = (e: Event) => {
    const pe = e as PointerEvent;
    if (pe.pointerType === 'touch') return;
    cancelPendingHover();
    pendingHoverTimer = window.setTimeout(() => {
      pendingHoverTimer = null;
      const text = typeof textOrFn === 'function' ? textOrFn() : textOrFn;
      if (text) {
        speakEnglish(text, {
          anchor: el,
          mode: 'hover',
          role,
          topic: opts.topic,
          showBubble: opts.showBubble,
        });
      }
    }, delayMs);
  };
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', cancelPendingHover);
  el.addEventListener('pointercancel', cancelPendingHover);
  return el;
}
