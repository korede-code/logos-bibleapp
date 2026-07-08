// src/components/AudioPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

interface AudioPlayerProps {
  verses: Array<{ verse: number; text: string }>;
  isVisible: boolean;
  onClose: () => void;
  theme: any;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ verses, isVisible, onClose, theme }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const isNative = Capacitor.isNativePlatform();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying]);

  useEffect(() => {
    const initTTS = async () => {
      if (isNative) {
        try {
          await TextToSpeech.openInstall();
        } catch (e) {
          console.error('Native TTS init error:', e);
          setIsSupported(false);
        }
      } else {
        if (!('speechSynthesis' in window)) {
          setIsSupported(false);
          return;
        }
        const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    };

    initTTS();
    return () => {
      stopSpeech();
    };
  }, [isNative]);

  const stopSpeech = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isNative) {
      try {
        await TextToSpeech.stop();
      } catch (e) {
        console.error('Stop native TTS error:', e);
      }
    } else {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  };

  // Calculate speech duration: ~2.5 words/sec at 1x speed
  const calculateDuration = (text: string, speechRate: number): number => {
    const wordCount = text.trim().split(/\s+/).length;
    const baseWPM = 150; // average speaking rate
    const adjustedWPM = baseWPM * speechRate;
    const minutes = wordCount / adjustedWPM;
    const ms = minutes * 60 * 1000;
    return Math.max(ms + 800, 1500); // add 800ms buffer, min 1.5s
  };

  const speakVerseNative = async (index: number) => {
    if (index >= verses.length) {
      setIsPlaying(false);
      setCurrentIndex(0);
      return;
    }

    const text = verses[index].text;
    await stopSpeech(); // Clear any previous

    try {
      // Start speaking - don't await this, it doesn't resolve when speech ends
      TextToSpeech.speak({
        text,
        lang: 'en-US',
        rate: rate,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });

      // Manually schedule next verse based on estimated duration
      const duration = calculateDuration(text, rate);
      console.log(`Verse ${index + 1} duration: ${duration}ms`);

      timeoutRef.current = setTimeout(() => {
        if (isPlayingRef.current && index < verses.length - 1) {
          const nextIndex = index + 1;
          setCurrentIndex(nextIndex);
          speakVerseNative(nextIndex); // Recursively chain
        } else {
          setIsPlaying(false);
          setCurrentIndex(0);
        }
      }, duration);

    } catch (e) {
      console.error('Native TTS speak error:', e);
      setIsPlaying(false);
    }
  };

  const speakVerseWeb = (index: number) => {
    if (index >= verses.length) {
      setIsPlaying(false);
      setCurrentIndex(0);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(verses[index].text);
    utteranceRef.current = utterance;
    utterance.rate = rate;

    const englishVoice = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onend = () => {
      if (isPlayingRef.current && index < verses.length - 1) {
        setCurrentIndex(index + 1);
      } else {
        setIsPlaying(false);
        setCurrentIndex(0);
      }
    };

    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!isNative && isPlaying) {
      speakVerseWeb(currentIndex);
    }
  }, [currentIndex, isPlaying]);

  const handlePlay = async () => {
    if (verses.length === 0) return;
    setIsPlaying(true);
    if (isNative) {
      await speakVerseNative(currentIndex);
    } else {
      speakVerseWeb(currentIndex);
    }
  };

  const handlePause = async () => {
    setIsPlaying(false);
    await stopSpeech();
  };

  const handleNext = async () => {
    await stopSpeech();
    if (currentIndex < verses.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (isPlayingRef.current && isNative) {
        await speakVerseNative(nextIndex);
      }
    }
  };

  const handlePrev = async () => {
    await stopSpeech();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      if (isPlayingRef.current && isNative) {
        await speakVerseNative(prevIndex);
      }
    }
  };

  const handleClose = async () => {
    await stopSpeech();
    setIsPlaying(false);
    setCurrentIndex(0);
    onClose();
  };

  if (!isVisible) return null;

  if (!isSupported) {
    return (
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
        <div className="max-w-md mx-auto rounded-2xl p-4 text-center" style={{ backgroundColor: theme.card }}>
          <p style={{ color: theme.text }}>Audio not supported</p>
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
            Install Google Speech Services from Play Store
          </p>
          <button onClick={onClose} className="mt-3 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: theme.accent, color: 'white' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
      <div className="max-w-md mx-auto rounded-2xl p-4 shadow-lg" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs" style={{ color: theme.textMuted }}>
            Verse {currentIndex + 1} of {verses.length} {isNative && '(Native)'}
          </span>
          <button onClick={handleClose} style={{ color: theme.textMuted }}><X size={16} /></button>
        </div>

        <p className="text-sm mb-3 px-2 py-1 rounded-lg" style={{ backgroundColor: theme.surface, color: theme.text }}>
          {verses[currentIndex]?.text?.substring(0, 120)}...
        </p>

        <div className="flex items-center justify-center gap-3">
          <button onClick={handlePrev} className="p-2 rounded-full" style={{ color: theme.text }}>
            <SkipBack size={20} />
          </button>
          {isPlaying? (
            <button onClick={handlePause} className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.accent, color: 'white' }}>
              <Pause size={24} />
            </button>
          ) : (
            <button onClick={handlePlay} className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.accent, color: 'white' }}>
              <Play size={24} />
            </button>
          )}
          <button onClick={handleNext} className="p-2 rounded-full" style={{ color: theme.text }}>
            <SkipForward size={20} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-xs" style={{ color: theme.textMuted }}>Speed:</span>
          {[0.75, 1, 1.25, 1.5].map(r => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: rate === r? theme.accent : theme.surface,
                color: rate === r? 'white' : theme.text
              }}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;