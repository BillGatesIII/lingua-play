import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from './rng';
import {
  createGameDirector, decideSpeech, getTopicExposure, nextParrotGreeting, recordSpoken,
  resetParrotGreeting, resetSpeechSession,
} from './speechDirector';
import { clearProgress } from './storage';
import { speakEnglish, stopSpeech } from './voice';

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

    // Solving after 2 mistakes triggers perseverance praise and resets mistakes
    const afterStruggle = director.celebrate('Three o clock');
    expect(afterStruggle).toContain('Three o clock!');
    expect(director.mistakes).toBe(0);

    // 3 consecutive first-try solves trigger streak celebration
    director.celebrate();
    expect(director.streak).toBe(2);
    const streakLine = director.celebrate();
    expect(director.streak).toBe(3);
    expect(streakLine.length).toBeGreaterThan(5);
  });

  it('cycles varied parrot greetings', () => {
    const first = nextParrotGreeting();
    const second = nextParrotGreeting();
    expect(first).toBe("Hello! Let's play!");
    expect(second).not.toBe(first);
  });
});
