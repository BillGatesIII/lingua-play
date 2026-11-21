import { h } from '../ui/dom';
import { loadProgress } from './storage';

export type SpeakMode = 'hover' | 'click' | 'event';

export interface SpeakOptions {
  anchor?: HTMLElement | null;
  mode?: SpeakMode;
  /** Optional custom visual text in the bubble (defaults to `text`). */
  displayText?: string;
}

const HOVER_DELAY_MS = 140;
const SAME_TEXT_COOLDOWN_MS = 900;
const PRIORITY_GRACE_MS = 350;

let bubbleEl: HTMLElement | null = null;
let bubbleTextEl: HTMLElement | null = null;
let hideTimer: number | null = null;
let pendingHoverTimer: number | null = null;
let lastSpokenText = '';
let lastSpokenAt = 0;
let lastPriorityAt = 0;
let currentUtteranceId = 0;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesHooked = false;

/** Removes emojis and extra whitespace so TTS reads natural English words cleanly. */
export function cleanSpeechText(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (!voicesHooked) {
    voicesHooked = true;
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', () => {
        cachedVoices = window.speechSynthesis.getVoices();
      });
    } catch {
      /* ignore */
    }
  }
  try {
    const list = window.speechSynthesis.getVoices();
    if (list.length) cachedVoices = list;
  } catch {
    /* ignore */
  }
  return cachedVoices;
}

export function pickEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  if (!english.length) return null;
  return (
    english.find((v) => /natural|neural|google us|samantha|daniel|aria|jenny|libby|karen/i.test(v.name))
    ?? english.find((v) => v.lang === 'en-US' && v.localService)
    ?? english.find((v) => v.lang.startsWith('en-US'))
    ?? english.find((v) => v.lang.startsWith('en-GB'))
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
  const bRect = bubble.getBoundingClientRect();
  const bw = Math.min(bRect.width || 240, vw - 24);
  const bh = bRect.height || 52;
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

export function hideBubble(): void {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (bubbleEl) {
    bubbleEl.classList.remove('voice-bubble--visible');
    bubbleEl.hidden = true;
  }
}

export function stopSpeech(): void {
  if (pendingHoverTimer !== null) {
    window.clearTimeout(pendingHoverTimer);
    pendingHoverTimer = null;
  }
  lastSpokenText = '';
  lastSpokenAt = 0;
  lastPriorityAt = 0;
  currentUtteranceId += 1;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
  hideBubble();
}

export function speakEnglish(text: string, opts: SpeakOptions = {}): void {
  const mode = opts.mode ?? 'click';
  const spoken = cleanSpeechText(text);
  const display = cleanSpeechText(opts.displayText ?? text) || text.trim();
  if (!spoken && !display) return;

  const now = Date.now();
  if (mode === 'hover') {
    if (spoken === lastSpokenText && now - lastSpokenAt < SAME_TEXT_COOLDOWN_MS) return;
    if (now - lastPriorityAt < PRIORITY_GRACE_MS) return;
  } else {
    lastPriorityAt = now;
  }

  lastSpokenText = spoken;
  lastSpokenAt = now;

  let anchorRect: DOMRect | null = null;
  if (opts.anchor && opts.anchor.isConnected) {
    anchorRect = opts.anchor.getBoundingClientRect();
  }

  const fallbackMs = Math.min(7000, Math.max(2000, display.length * 85));
  showBubble(display, anchorRect, fallbackMs);

  const soundOn = loadProgress().settings.sound;
  if (!soundOn || !spoken || typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return;
  }

  const id = ++currentUtteranceId;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spoken);
    const voice = pickEnglishVoice(loadVoices());
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = 0.92;
    utterance.pitch = 1.05;

    const scheduleShortHide = () => {
      if (id !== currentUtteranceId) return;
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (id === currentUtteranceId) hideBubble();
      }, 750);
    };
    utterance.onend = scheduleShortHide;
    utterance.onerror = scheduleShortHide;

    window.speechSynthesis.speak(utterance);
  } catch {
    /* keep visual bubble even if speechSynthesis fails */
  }
}

export function cancelPendingHover(): void {
  if (pendingHoverTimer !== null) {
    window.clearTimeout(pendingHoverTimer);
    pendingHoverTimer = null;
  }
}

/** Attaches mouseover (pointerenter) English voice + speech bubble to an element. */
export function addHoverVoice<T extends HTMLElement>(
  el: T,
  textOrFn: string | (() => string),
  delayMs = HOVER_DELAY_MS,
): T {
  const onEnter = (e: Event) => {
    const pe = e as PointerEvent;
    if (pe.pointerType === 'touch') return;
    cancelPendingHover();
    pendingHoverTimer = window.setTimeout(() => {
      pendingHoverTimer = null;
      const text = typeof textOrFn === 'function' ? textOrFn() : textOrFn;
      if (text) speakEnglish(text, { anchor: el, mode: 'hover' });
    }, delayMs);
  };
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', cancelPendingHover);
  el.addEventListener('pointercancel', cancelPendingHover);
  return el;
}

/** Emoji-to-English names for interactive collection badges on the landing page. */
export const EMOJI_ENGLISH: Record<string, string> = {
  '🍌': 'banana',
  '🥚': 'egg',
  '🍎': 'apple',
  '🍊': 'orange',
  '🍞': 'bread',
  '🍅': 'tomato',
  '🧀': 'cheese',
  '🍉': 'watermelon',
  '💎': 'diamond',
  '👑': 'crown',
  '🏺': 'treasure vase',
  '🗝️': 'golden key',
  '💰': 'bag of gold',
  '🔴': 'red',
  '🟡': 'yellow',
  '🔵': 'blue',
  '⚪': 'white',
  '⚫': 'black',
  '🟠': 'orange',
  '🟢': 'green',
  '🟣': 'purple',
  '🌸': 'pink',
  '🩵': 'light blue',
  '🧈': 'light yellow',
  '🟤': 'brown',
  '🩶': 'grey',
  '🪻': 'lavender',
  '🌿': 'mint green',
  '🌲': 'dark green',
  '🌌': 'navy blue',
  '🍒': 'maroon',
  '🍲': 'rainbow soup',
  '🥤': 'space smoothie',
  '🍕': 'monster pizza',
  '🥗': 'magic salad',
  '🧁': 'star cupcake',
  '🏖️': 'the beach',
  '🏔️': 'the mountains',
  '🏛️': 'the museum',
  '🎢': 'the funfair',
  '🍪': 'cookies',
  '🍍': 'golden pineapple',
  '🔑': 'secret key',
  '🎸': 'guitar',
  '🏠': 'house',
  '🐈': 'cat',
  '🌙': 'moon',
  '☁️': 'cloud',
  '📚': 'book',
  '🔥': 'fire',
  '🏴‍☠️': 'pirate',
  '⭐': 'star',
  '🐢': 'turtle',
  '🦋': 'butterfly',
  '🌷': 'tulip',
  '🌻': 'sunflower',
  '🌼': 'daisy',
  '🌺': 'hibiscus',
};
