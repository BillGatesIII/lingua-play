import { pick, type Rng } from './rng';

export type VoiceRole = 'explicit' | 'vocab' | 'chrome' | 'step' | 'event';

export interface SpeechDecisionInput {
  role: VoiceRole;
  mode: 'hover' | 'click' | 'event';
  topic: string;
  now: number;
}

export interface SpeechDecision {
  showBubble: boolean;
  speakAudio: boolean;
}

interface TopicMemory {
  count: number;
  lastSpokenAt: number;
}

const HOVER_AUDIO_GAP_MS = 2200;
const VOCAB_REPEAT_HOVER_MS = 15_000;
const VOCAB_FAMILIAR_REFRESH_MS = 60_000;
const STEP_FAMILIAR_COOLDOWN_MS = 25_000;
const STEP_FAMILIAR_COUNT = 3;
const VOCAB_CLICK_REPEAT_MS = 1200;

const topicMemory = new Map<string, TopicMemory>();
let lastHoverAudioAt = 0;

export function normalizeTopic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clears session familiarity and cooldowns (e.g. when resetting progress or in tests). */
export function resetSpeechSession(): void {
  topicMemory.clear();
  lastHoverAudioAt = 0;
}

export function getTopicExposure(topic: string): number {
  const key = normalizeTopic(topic);
  return key ? (topicMemory.get(key)?.count ?? 0) : 0;
}

export function recordSpoken(topic: string, mode: 'hover' | 'click' | 'event', now: number): void {
  const key = normalizeTopic(topic);
  if (key) {
    const prev = topicMemory.get(key);
    topicMemory.set(key, {
      count: (prev?.count ?? 0) + 1,
      lastSpokenAt: now,
    });
  }
  if (mode === 'hover') {
    lastHoverAudioAt = now;
  }
}

/**
 * Decides whether a speech request should show the visual bubble and/or play audio,
 * preventing repetitive hover chatter and quieting familiar UI/step phrases.
 */
export function decideSpeech(input: SpeechDecisionInput): SpeechDecision {
  const { role, mode, now } = input;
  const key = normalizeTopic(input.topic);
  const mem = key ? topicMemory.get(key) : undefined;

  if (role === 'explicit' || role === 'event') {
    return { showBubble: true, speakAudio: true };
  }

  if (role === 'chrome') {
    if (mode === 'hover') {
      return { showBubble: true, speakAudio: false };
    }
    return { showBubble: true, speakAudio: true };
  }

  if (role === 'step') {
    if (mem && mem.count >= STEP_FAMILIAR_COUNT && now - mem.lastSpokenAt < STEP_FAMILIAR_COOLDOWN_MS) {
      return { showBubble: true, speakAudio: false };
    }
    return { showBubble: true, speakAudio: true };
  }

  // role === 'vocab'
  if (mode === 'hover') {
    if (lastHoverAudioAt > 0 && now - lastHoverAudioAt < HOVER_AUDIO_GAP_MS) {
      return { showBubble: true, speakAudio: false };
    }
    if (!mem || mem.count === 0) {
      return { showBubble: true, speakAudio: true };
    }
    if (mem.count === 1) {
      return { showBubble: true, speakAudio: now - mem.lastSpokenAt >= VOCAB_REPEAT_HOVER_MS };
    }
    return { showBubble: true, speakAudio: now - mem.lastSpokenAt >= VOCAB_FAMILIAR_REFRESH_MS };
  }

  // vocab on click
  if (mem && now - mem.lastSpokenAt < VOCAB_CLICK_REPEAT_MS) {
    return { showBubble: true, speakAudio: false };
  }
  return { showBubble: true, speakAudio: true };
}

const PRAISE_LINES: readonly string[] = [
  'Brilliant!',
  'Spot on!',
  'Lovely!',
  'Smashing!',
  'Splendid!',
  'Well done!',
  'Marvellous!',
  'Cracking job!',
  'Top notch!',
  'Super!',
];

const STREAK_LINES: readonly ((streak: number) => string)[] = [
  (n) => `${n} in a row! Brilliant!`,
  () => 'Unstoppable! Spot on!',
  () => 'On a roll! Splendid work!',
  () => 'Clever clogs! Another one right!',
  (n) => `${n} right in a row! Marvellous!`,
];

const PERSEVERANCE_LINES: readonly string[] = [
  'You cracked it!',
  'Got it! You stuck with it!',
  'Yes! You worked it out!',
  'Brilliant! Never gave up!',
  'Hooray! Third time lucky!',
];

const OOPS_LINES: readonly string[] = [
  'Oops, not quite!',
  'Nearly there! Have another go!',
  'Close one! Try again!',
  'Whoopsie! Give it another try!',
  'Almost! Have another look!',
  'Not quite yet — you have got this!',
];

const PARROT_GREETINGS: readonly string[] = [
  "Hello! Let's play!",
  'Hiya! Fancy a game?',
  'Cheerio! Ready for an adventure?',
  'Good day! Which game shall we play?',
  "Right then, let's have some fun!",
  'Splendid to see you! Pick a game!',
];

let parrotIndex = 0;

/** Cycles through varied British English greetings for the landing-page parrot. */
export function nextParrotGreeting(): string {
  const line = PARROT_GREETINGS[parrotIndex % PARROT_GREETINGS.length];
  parrotIndex += 1;
  return line;
}

export function resetParrotGreeting(): void {
  parrotIndex = 0;
}

export interface GameSpeechDirector {
  /** Picks a non-repeating line from a pool of British English variants. */
  pickLine(poolKey: string, lines: readonly string[]): string;
  /** Returns a varied British praise phrase aware of streaks and perseverance, resetting puzzle mistakes. */
  celebrate(subject?: string): string;
  /**
   * Records a mistake on the current puzzle and returns a gentle reaction on the first attempt
   * or a helpful British hint when the child is stuck (2nd+ mistake).
   */
  encourage(hint: string, firstMistakeLine?: string): string;
  /** Returns a varied transition line, or null when staying quietly out of the way. */
  transition(poolKey: string, lines: readonly string[], quietAfter?: number): string | null;
  /** Resets per-puzzle mistake tracking when advancing to a new challenge. */
  nextPuzzle(): void;
  readonly mistakes: number;
  readonly streak: number;
}

/**
 * Per-game speech director that tracks streaks, repeated mistakes, and recent lines
 * so feedback feels lively, helpful, and never repetitive.
 */
export function createGameDirector(rng: Rng): GameSpeechDirector {
  let mistakes = 0;
  let streak = 0;
  let transitions = 0;
  const recentByPool = new Map<string, number[]>();

  function pickIndex(poolKey: string, length: number): number {
    if (length <= 1) return 0;
    const recent = recentByPool.get(poolKey) ?? [];
    const memorySize = Math.min(length - 1, 3);
    const blocked = new Set(recent.slice(-memorySize));
    const candidates: number[] = [];
    for (let i = 0; i < length; i++) {
      if (!blocked.has(i)) candidates.push(i);
    }
    const chosen = pick(rng, candidates.length ? candidates : [0]);
    recent.push(chosen);
    if (recent.length > memorySize + 2) recent.shift();
    recentByPool.set(poolKey, recent);
    return chosen;
  }

  function pickLine(poolKey: string, lines: readonly string[]): string {
    return lines[pickIndex(poolKey, lines.length)];
  }

  function celebrate(subject?: string): string {
    const cleanSubject = subject?.trim();
    let lead: string;
    if (mistakes >= 2) {
      lead = pickLine('perseverance', PERSEVERANCE_LINES);
      streak = 1;
    } else if (mistakes === 0) {
      streak += 1;
      if (streak >= 3) {
        const fn = STREAK_LINES[pickIndex('streak', STREAK_LINES.length)];
        lead = fn(streak);
      } else {
        lead = pickLine('praise', PRAISE_LINES);
      }
    } else {
      streak = 1;
      lead = pickLine('praise', PRAISE_LINES);
    }
    mistakes = 0;
    if (!cleanSubject) return lead;
    const endPunct = /[.!?]$/.test(cleanSubject) ? '' : '!';
    return `${lead} ${cleanSubject}${endPunct}`;
  }

  function encourage(hint: string, firstMistakeLine?: string): string {
    mistakes += 1;
    streak = 0;
    if (mistakes === 1) {
      return firstMistakeLine?.trim() || pickLine('oops', OOPS_LINES);
    }
    if (mistakes === 2) {
      return `Hint: ${hint}`;
    }
    return pickLine('encourage-hint', [
      hint,
      `Tip: ${hint}`,
      `Nearly! ${hint}`,
    ]);
  }

  function transition(poolKey: string, lines: readonly string[], quietAfter = 0): string | null {
    transitions += 1;
    mistakes = 0;
    if (quietAfter > 0 && transitions > quietAfter && transitions % 2 === 0) {
      return null;
    }
    return pickLine(poolKey, lines);
  }

  function nextPuzzle(): void {
    mistakes = 0;
  }

  return {
    pickLine,
    celebrate,
    encourage,
    transition,
    nextPuzzle,
    get mistakes() { return mistakes; },
    get streak() { return streak; },
  };
}
