import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button, SpeakButton } from '../ui/components';
import { mulberry32 } from './rng';
import {
  createGameDirector, decideSpeech, getTopicExposure, nextParrotGreeting, recordSpoken,
  resetParrotGreeting, resetSpeechSession,
} from './speechDirector';
import { clearProgress } from './storage';
import { speakEnglish, stopSpeech } from './voice';

function mockSpeechSynthesis(): string[] {
  const spoken: string[] = [];
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speaking: false,
      pending: false,
      speak: vi.fn((u: { text: string }) => { spoken.push(u.text); }),
      cancel: vi.fn(),
      getVoices: () => [],
    },
  });
  class MockUtterance {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(t: string) { this.text = t; }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  return spoken;
}

describe('speechDirector (Layer 1 intelligent speech)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T11:00:00Z'));
    localStorage.clear();
    clearProgress();
    document.body.innerHTML = '';
    stopSpeech();
    resetSpeechSession();
    resetParrotGreeting();
  });

  afterEach(() => {
    stopSpeech();
    resetSpeechSession();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps chrome hovers visual-only so UI buttons do not nag', () => {
    const decision = decideSpeech({ role: 'chrome', mode: 'hover', topic: 'Home', now: Date.now() });
    expect(decision).toEqual({ showBubble: true, speakAudio: false });
  });

  it('paces vocab hovers with global spacing and familiarity cooldowns', () => {
    const t0 = Date.now();
    expect(decideSpeech({ role: 'vocab', mode: 'hover', topic: 'apple', now: t0 })).toEqual({
      showBubble: true, speakAudio: true,
    });
    recordSpoken('apple', 'hover', t0);
    expect(getTopicExposure('Apple!')).toBe(1);

    // Rapid hover onto another vocab word within 2.2s stays silent
    expect(decideSpeech({ role: 'vocab', mode: 'hover', topic: 'banana', now: t0 + 800 })).toEqual({
      showBubble: true, speakAudio: false,
    });

    // After 2.5s, a fresh word speaks aloud
    expect(decideSpeech({ role: 'vocab', mode: 'hover', topic: 'banana', now: t0 + 2500 })).toEqual({
      showBubble: true, speakAudio: true,
    });

    // Repeating 'apple' after 5s is silent (needs 15s for 2nd exposure)
    expect(decideSpeech({ role: 'vocab', mode: 'hover', topic: 'apple', now: t0 + 5000 })).toEqual({
      showBubble: true, speakAudio: false,
    });

    // After 16s, 2nd exposure speaks aloud
    expect(decideSpeech({ role: 'vocab', mode: 'hover', topic: 'apple', now: t0 + 16_000 })).toEqual({
      showBubble: true, speakAudio: true,
    });
    recordSpoken('apple', 'hover', t0 + 16_000);

    // 3rd exposure stays silent until 60s refresher window
    expect(decideSpeech({ role: 'vocab', mode: 'hover', topic: 'apple', now: t0 + 40_000 })).toEqual({
      showBubble: true, speakAudio: false,
    });
    expect(decideSpeech({ role: 'vocab', mode: 'hover', topic: 'apple', now: t0 + 80_000 })).toEqual({
      showBubble: true, speakAudio: true,
    });
  });

  it('quiets repetitive step topics after 3 exposures within the cooldown window', () => {
    const t0 = Date.now();
    for (let i = 0; i < 3; i++) {
      expect(decideSpeech({ role: 'step', mode: 'click', topic: 'compass-N', now: t0 + i * 1000 }).speakAudio).toBe(true);
      recordSpoken('compass-N', 'click', t0 + i * 1000);
    }
    expect(decideSpeech({ role: 'step', mode: 'click', topic: 'compass-N', now: t0 + 5000 })).toEqual({
      showBubble: true, speakAudio: false,
    });
    // Still speaks after 25s cooldown
    expect(decideSpeech({ role: 'step', mode: 'click', topic: 'compass-N', now: t0 + 30_000 }).speakAudio).toBe(true);
  });

  it('coalesces rapid step clicks so TTS speaks only the settled result once', () => {
    const spoken = mockSpeechSynthesis();

    speakEnglish('one apple', { mode: 'click', role: 'step', coalesceKey: 'market-bag' });
    vi.advanceTimersByTime(150);
    speakEnglish('two apples', { mode: 'click', role: 'step', coalesceKey: 'market-bag' });
    vi.advanceTimersByTime(150);
    speakEnglish('three apples', { mode: 'click', role: 'step', coalesceKey: 'market-bag' });

    // Visual bubble updates immediately, audio hasn't fired yet
    expect(document.querySelector('.voice-bubble')?.textContent).toContain('three apples');
    expect(spoken).toEqual([]);

    vi.advanceTimersByTime(450);
    expect(spoken).toEqual(['three apples']);
  });

  it('cancels a pending coalesced step if an immediate event interrupts it', () => {
    const spoken = mockSpeechSynthesis();

    speakEnglish('three apples', { mode: 'click', role: 'step', coalesceKey: 'market-bag' });
    vi.advanceTimersByTime(150);
    speakEnglish('Spot on!', { mode: 'event' });
    vi.advanceTimersByTime(500);

    expect(spoken).toEqual(['Spot on!']);
  });

  it('varies game reactions without repeating back-to-back, celebrates streaks, and gives hints on 2nd mistake', () => {
    const director = createGameDirector(mulberry32(42));

    // Avoid immediate repeats from a pool
    const pool = ['Line A', 'Line B', 'Line C', 'Line D'];
    let prev = '';
    for (let i = 0; i < 12; i++) {
      const next = director.pickLine('test', pool);
      expect(next).not.toBe(prev);
      prev = next;
    }

    // 1st mistake uses firstMistakeLine; 2nd mistake switches to helpful hint
    const first = director.encourage('Look at the red hand!', 'Too early!');
    expect(first).toBe('Too early!');
    const second = director.encourage('Look at the red hand!', 'Too early!');
    expect(second).toContain('Look at the red hand!');

    // Solving after 2 mistakes triggers perseverance praise and resets mistakes & first-try streak
    const afterStruggle = director.celebrate('purple');
    expect(afterStruggle).toContain('Purple!');
    expect(director.mistakes).toBe(0);
    expect(director.streak).toBe(0);

    // 3 consecutive first-try solves trigger streak celebration
    director.celebrate();
    expect(director.streak).toBe(1);
    director.celebrate();
    expect(director.streak).toBe(2);
    const streakLine = director.celebrate();
    expect(director.streak).toBe(3);
    expect(streakLine.length).toBeGreaterThan(5);
  });

  it('quiets transitions after quietAfter and resets puzzle mistakes', () => {
    const director = createGameDirector(mulberry32(7));
    director.encourage('Hint text', 'Oops!');
    expect(director.mistakes).toBe(1);

    expect(director.transition('next', ['Line A', 'Line B'], 2)).not.toBeNull();
    expect(director.mistakes).toBe(0);
    expect(director.transition('next', ['Line A', 'Line B'], 2)).not.toBeNull();
    expect(director.transition('next', ['Line A', 'Line B'], 2)).not.toBeNull();
    expect(director.transition('next', ['Line A', 'Line B'], 2)).toBeNull();
  });

  it('keeps hover from stealing the bubble or TTS while a coalesced step is pending', () => {
    const spoken = mockSpeechSynthesis();

    speakEnglish('three apples', { mode: 'click', role: 'step', coalesceKey: 'market-bag' });
    vi.advanceTimersByTime(380);
    // Past PRIORITY_GRACE_MS (350ms), but still before STEP_COALESCE_MS (420ms)
    speakEnglish('banana', { mode: 'hover', role: 'vocab' });
    expect(document.querySelector('.voice-bubble')?.textContent).toContain('three apples');
    expect(spoken).toEqual([]);

    vi.advanceTimersByTime(60);
    expect(spoken).toEqual(['three apples']);
    expect(document.querySelector('.voice-bubble')?.textContent).toContain('three apples');
  });

  it('uses silent chrome hovers for Button and hoverText for SpeakButton without calling english() early', () => {
    const spoken = mockSpeechSynthesis();

    const uiBtn = Button('Inicio', { voiceHover: 'Home' });
    const getGreeting = vi.fn(() => 'Cheerio!');
    const parrotBtn = SpeakButton('🦜', { english: getGreeting, hoverText: 'Hello!' });
    document.body.append(uiBtn, parrotBtn);

    uiBtn.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
    vi.advanceTimersByTime(330);
    expect(document.querySelector('.voice-bubble')?.textContent).toContain('Home');
    expect(spoken).toEqual([]);

    parrotBtn.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
    vi.advanceTimersByTime(270);
    expect(getGreeting).not.toHaveBeenCalled();
    expect(document.querySelector('.voice-bubble')?.textContent).toContain('Hello!');
    expect(spoken).toEqual(['Hello!']);

    parrotBtn.click();
    expect(getGreeting).toHaveBeenCalledTimes(1);
    expect(spoken).toEqual(['Hello!', 'Cheerio!']);
  });

  it('cycles varied parrot greetings and resets cleanly', () => {
    const first = nextParrotGreeting();
    const second = nextParrotGreeting();
    expect(first).toBe("Hello! Let's play!");
    expect(second).not.toBe(first);
    resetParrotGreeting();
    expect(nextParrotGreeting()).toBe("Hello! Let's play!");
  });
});
