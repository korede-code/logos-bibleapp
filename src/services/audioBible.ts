// src/services/audioBible.ts

class AudioBibleService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentVerseIndex: number = 0;
  private verses: string[] = [];
  private onVerseChange: ((index: number) => void) | null = null;
  private onEnd: (() => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private rate: number = 0.9;
  private pitch: number = 1;

  constructor() {
    // Load voices when they're ready
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices();
        // Prefer English voice
        this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      };
    }
  }

  setVoice(voice: SpeechSynthesisVoice) {
    this.voice = voice;
  }

  setRate(rate: number) {
    this.rate = rate;
  }

  setPitch(pitch: number) {
    this.pitch = pitch;
  }

  setOnVerseChange(callback: (index: number) => void) {
    this.onVerseChange = callback;
  }

  setOnEnd(callback: () => void) {
    this.onEnd = callback;
  }

  setOnError(callback: (error: string) => void) {
    this.onError = callback;
  }

  async playVerses(verses: Array<{ verse: number; text: string }>) {
    if (!('speechSynthesis' in window)) {
      this.onError?.('Speech synthesis not supported');
      return;
    }

    // Mobile browsers need a user interaction before speech works
    this.stop();
    
    // Combine verses for continuous reading on mobile
    const combinedText = verses.map(v => v.text).join('. ');
    this.verses = [combinedText];
    this.currentVerseIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;

    // Small delay for mobile
    setTimeout(() => this.speakCurrentVerse(), 100);
  }

  private speakCurrentVerse() {
    if (this.currentVerseIndex >= this.verses.length) {
      this.isPlaying = false;
      this.onEnd?.();
      return;
    }

    const text = this.verses[this.currentVerseIndex];
    this.utterance = new SpeechSynthesisUtterance(text);
    
    if (this.voice) this.utterance.voice = this.voice;
    this.utterance.rate = this.rate;
    this.utterance.pitch = this.pitch;
    this.utterance.volume = 1;

    this.utterance.onstart = () => {
      this.onVerseChange?.(this.currentVerseIndex);
    };

    this.utterance.onend = () => {
      this.currentVerseIndex++;
      if (this.isPlaying && !this.isPaused) {
        this.speakCurrentVerse();
      }
    };

    this.utterance.onerror = (event) => {
      if (event.error !== 'canceled') {
        this.onError?.(event.error);
      }
    };

    window.speechSynthesis.speak(this.utterance);
  }

  pause() {
    if (this.isPlaying && !this.isPaused) {
      window.speechSynthesis.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.isPlaying && this.isPaused) {
      window.speechSynthesis.resume();
      this.isPaused = false;
    }
  }

  stop() {
    window.speechSynthesis.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentVerseIndex = 0;
  }

  skipForward() {
    if (this.currentVerseIndex < this.verses.length - 1) {
      this.currentVerseIndex++;
      window.speechSynthesis.cancel();
      this.speakCurrentVerse();
    }
  }

  skipBackward() {
    if (this.currentVerseIndex > 0) {
      this.currentVerseIndex--;
      window.speechSynthesis.cancel();
      this.speakCurrentVerse();
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis.getVoices();
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentVerseIndex: this.currentVerseIndex,
      totalVerses: this.verses.length,
      rate: this.rate,
      pitch: this.pitch,
    };
  }
}

export const audioBible = new AudioBibleService();

if (typeof window !== 'undefined') {
  (window as any).__audioBible = audioBible;
}