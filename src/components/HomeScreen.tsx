/**
 * Logos Daily — Home Screen Component
 * =====================================
 * The dynamic home screen featuring:
 * - Daily verse with beautiful card presentation
 * - Quick-resume reading button
 * - Reading streak tracker
 * - Active reading plans progress
 * - Recent highlights and bookmarks
 * - Quick navigation to study tools
 * 
 * 🔥 FIXED: Navigation for both card and Read Chapter button
 * 🔥 FIXED: Proper parsing of DAILY_VERSES fallback data
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Bookmark, Flame, Star, ChevronRight,
  Sun, Cloud, CloudRain, Target,
  TrendingUp, Clock, Wifi, Bell, RefreshCw, Crown
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { DAILY_VERSES, BIBLE_BOOKS } from '../data/bibleData';
import { format } from 'date-fns';
import { bibleApi } from '../services/bibleApiClient';
import ProUpgradeModal from './ProUpgradeModal';
import { auth } from '../config/firebase';

interface HomeScreenProps {
  theme?: any;
  onClose?: () => void;
  navigate?: (screen: string) => void;
}

const defaultTheme = {
  bg: '#1a1a1a',
  card: '#2a2a2a',
  surface: '#333333',
  text: '#ffffff',
  textMuted: '#aaaaaa',
  textFaint: '#777777',
  accent: '#488AFF',
  border: '#444444',
  warning: '#f59e0b'
};

// ✅ Helper function to parse verse reference like "John 3:16"
const parseVerseReference = (reference: string) => {
  // Handle formats like "John 3:16" or "Psalms 23:1"
  const match = reference.match(/^([A-Za-z\s]+)\s+(\d+):(\d+)$/);
  if (match) {
    return {
      book: match[1].trim(),
      chapter: parseInt(match[2]),
      verse: parseInt(match[3])
    };
  }
  return null;
};

// ✅ Helper to find book ID
const findBookId = (bookName: string): number => {
  const book = BIBLE_BOOKS.find(b => 
    b.name.toLowerCase() === bookName.toLowerCase()
  );
  return book?.id || 43; // Default to John
};

const HomeScreen: React.FC<HomeScreenProps> = ({ theme, onClose, navigate }) => {
  const t = theme || defaultTheme;
  const {
    readerSettings, readingPosition, streak,
    activePlans, highlights, bookmarks,
    notes, isPro, setReadingPosition,
    realVerseOfTheDay,
    isApiLoading,
    apiError,
    fetchRealVerseOfTheDay,
    isOnline
  } = useAppStore();

  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [refreshing, setRefreshing] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const hasFetchedRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Get the current verse to display (API verse or fallback)
  const getCurrentVerse = useCallback(() => {
    // If we have a real verse from API, use it
    if (realVerseOfTheDay) {
      return {
        reference: realVerseOfTheDay.reference,
        text: realVerseOfTheDay.text,
        translation: realVerseOfTheDay.translation || 'NIV',
        book: realVerseOfTheDay.book || extractBookFromReference(realVerseOfTheDay.reference),
        chapter: realVerseOfTheDay.chapter || extractChapterFromReference(realVerseOfTheDay.reference),
        verse: realVerseOfTheDay.verse || extractVerseFromReference(realVerseOfTheDay.reference),
        isReal: true
      };
    }
    
    // Otherwise use DAILY_VERSES as fallback
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const fallbackVerse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
    
    if (fallbackVerse) {
      const parsed = parseVerseReference(fallbackVerse.reference);
      return {
        reference: fallbackVerse.reference,
        text: fallbackVerse.text,
        translation: fallbackVerse.translation || 'KJV',
        book: parsed?.book || 'John',
        chapter: parsed?.chapter || 3,
        verse: parsed?.verse || 16,
        isReal: false
      };
    }
    
    return null;
  }, [realVerseOfTheDay]);

  // ✅ Navigation helper for verse card - FIXED
  const navigateToVerse = useCallback((verse: any, goToChapter: boolean = false) => {
    if (!verse) {
      console.error('❌ No verse data to navigate to');
      return;
    }
    
    console.log(`📖 Navigating to ${goToChapter ? 'chapter' : 'verse'}:`, verse.reference);
    console.log('📖 Verse data:', verse);
    
    // ✅ Find the book in BIBLE_BOOKS
    let bookData = BIBLE_BOOKS.find(b => 
      b.name.toLowerCase() === verse.book.toLowerCase()
    );
    
    // ✅ If not found, try partial match
    if (!bookData) {
      bookData = BIBLE_BOOKS.find(b => 
        verse.reference.toLowerCase().includes(b.name.toLowerCase())
      );
    }
    
    // ✅ If still not found, try to find by abbreviation
    if (!bookData) {
      bookData = BIBLE_BOOKS.find(b => 
        verse.book.toLowerCase().includes(b.name.toLowerCase()) ||
        b.name.toLowerCase().includes(verse.book.toLowerCase())
      );
    }
    
    if (bookData) {
      console.log('✅ Found book:', bookData.name, 'ID:', bookData.id);
      setReadingPosition({ 
        book: bookData.name, 
        bookId: bookData.id, 
        chapter: verse.chapter,
        verse: goToChapter ? 1 : verse.verse
      });
      navigate('reader');
    } else {
      console.error('❌ Book not found for:', verse.book);
      console.log('📚 Available books:', BIBLE_BOOKS.map(b => b.name));
      
      // ✅ Fallback: try to navigate anyway using the verse book name
      setReadingPosition({ 
        book: verse.book, 
        bookId: findBookId(verse.book),
        chapter: verse.chapter,
        verse: goToChapter ? 1 : verse.verse
      });
      navigate('reader');
    }
  }, [setReadingPosition, navigate]);

  // ✅ Optimized fetch with caching
  useEffect(() => {
    // Check if we already have a verse cached
    const cachedVerse = localStorage.getItem('votd_cached');
    const cachedTimestamp = localStorage.getItem('votd_timestamp');
    const now = Date.now();
    const cacheAge = cachedTimestamp ? now - parseInt(cachedTimestamp) : Infinity;
    const cacheValid = cacheAge < 3600000; // 1 hour cache

    // If we have a valid cached verse and no real verse loaded, use it immediately
    if (cachedVerse && cacheValid && !realVerseOfTheDay) {
      try {
        const verse = JSON.parse(cachedVerse);
        console.log('📦 Using cached verse:', verse.reference);
        useAppStore.setState({ realVerseOfTheDay: verse, isApiLoading: false });
        setIsInitialLoad(false);
        return;
      } catch (e) {
        console.error('Failed to parse cached verse:', e);
      }
    }

    // Only fetch if we haven't already and not currently loading
    if (!hasFetchedRef.current && !isApiLoading && !realVerseOfTheDay) {
      hasFetchedRef.current = true;
      
      const fetchVerse = () => {
        console.log('🔄 Fetching verse of the day...');
        fetchRealVerseOfTheDay()
          .then(() => {
            setIsInitialLoad(false);
            const verse = useAppStore.getState().realVerseOfTheDay;
            if (verse) {
              localStorage.setItem('votd_cached', JSON.stringify(verse));
              localStorage.setItem('votd_timestamp', String(Date.now()));
            }
          })
          .catch((error) => {
            console.error('Failed to fetch verse:', error);
            setIsInitialLoad(false);
          });
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(fetchVerse, { timeout: 2000 });
      } else {
        fetchTimeoutRef.current = setTimeout(fetchVerse, 100);
      }
    } else if (realVerseOfTheDay) {
      setIsInitialLoad(false);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchRealVerseOfTheDay, isApiLoading, realVerseOfTheDay]);

  // ✅ Handle manual refresh
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refresh button clicked - fetching random verse');
    
    if (refreshing || isApiLoading) {
      console.log('⏳ Already refreshing or loading, skipping...');
      return;
    }
    
    setRefreshing(true);
    
    try {
      localStorage.removeItem('votd_cached');
      localStorage.removeItem('votd_timestamp');
      localStorage.removeItem('votd_random');
      
      useAppStore.setState({ isApiLoading: true });
      
      const response = await bibleApi.getVerseOfTheDay(true);
      
      console.log('📥 API Response:', response);
      
      if (response.success && response.data) {
        const verseData = {
          reference: response.data.reference,
          text: response.data.text,
          translation: response.data.translation || 'NIV',
          book: response.data.book || extractBookFromReference(response.data.reference),
          chapter: response.data.chapter || extractChapterFromReference(response.data.reference),
          verse: response.data.verse || extractVerseFromReference(response.data.reference)
        };
        
        useAppStore.setState({ 
          realVerseOfTheDay: verseData,
          isApiLoading: false,
          apiError: null
        });
        
        localStorage.setItem('votd_cached', JSON.stringify(verseData));
        localStorage.setItem('votd_timestamp', String(Date.now()));
        
        console.log('✅ New verse loaded:', verseData.reference);
        showToast(`✨ New verse: ${verseData.reference}`, 'success');
      } else {
        throw new Error('No verse data');
      }
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      useAppStore.setState({ 
        apiError: 'Failed to load verse. Please try again.',
        isApiLoading: false
      });
      showToast('Failed to refresh verse. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, isApiLoading]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const colors = {
      success: '#4CAF50',
      error: '#e53935',
      info: theme?.accent || '#488AFF'
    };
    
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: ${colors[type]}; color: white; padding: 10px 20px;
      border-radius: 10px; z-index: 1000; font-size: 14px;
      animation: fadeInUp 0.3s ease; max-width: 90%; text-align: center;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  const handleUpgradeClick = () => {
    if (!currentUser) {
      navigate('settings');
      showToast('Please sign in first to upgrade to Pro', 'info');
    } else {
      setShowProModal(true);
    }
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning'); setTimeOfDay('morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon'); setTimeOfDay('afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good Evening'); setTimeOfDay('evening');
    } else {
      setGreeting('Good Night'); setTimeOfDay('night');
    }
  }, []);

  const greetingIcon = { 
    morning: <Sun size={18} />, 
    afternoon: <Cloud size={18} />, 
    evening: <CloudRain size={18} />, 
    night: <Star size={18} /> 
  }[timeOfDay];

  const lastReadBook = BIBLE_BOOKS.find(b => b.id === readingPosition.bookId);
  const recentHighlights = highlights.slice(-3).reverse();
  
  // ✅ Get the current verse
  const currentVerse = getCurrentVerse();

  const StreakFire = ({ count }: { count: number }) => (
    <div className="flex items-center gap-1">
      {[...Array(Math.min(count, 7))].map((_, i) => (
        <div key={i} className="relative" style={{ opacity: Math.max(0.3, 1 - (Math.min(count, 7) - 1 - i) * 0.12) }}>
          <Flame size={16} style={{ color: i === Math.min(count, 7) - 1 ? '#FF6B35' : '#FFA500' }} />
        </div>
      ))}
    </div>
  );

  const shouldShowLoading = isInitialLoad && !currentVerse && isApiLoading;
  const shouldShowError = apiError && !currentVerse;
  const shouldShowVerse = currentVerse;

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-5 pt-6 pb-4"
        style={{ backgroundColor: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5" style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
              {greetingIcon}
              <span className="font-medium">{greeting}</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif', letterSpacing: '-0.01em' }}>
              Synthesis Bible
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: theme.surface, 
                color: theme.textMuted, 
                border: `1px solid ${theme.border}` 
              }}
            >
              <Wifi size={10} style={{ color: isOnline ? '#4CAF50' : '#f59e0b' }} />
              <span>{isOnline ? 'Synced' : 'Offline'}</span>
            </div>
            {isPro && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                <Crown size={10} />
                PRO
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || isApiLoading}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              aria-label="Refresh verse of the day"
            >
              <RefreshCw 
                size={16} 
                style={{ color: theme.textMuted }} 
                className={refreshing || isApiLoading ? 'animate-spin' : ''}
              />
            </button>
            <button
              onClick={() => navigate('settings')}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              aria-label="Settings"
            >
              <Bell size={16} style={{ color: theme.textMuted }} />
            </button>
          </div>
        </div>
      </div>

      {!isOnline && (
        <div className="px-5 mt-2">
          <div 
            className="rounded-xl p-2 text-center text-xs"
            style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
          >
            📡 Offline mode - using cached verses
          </div>
        </div>
      )}

      <div className="px-5 pb-24 space-y-6 mt-4">

        {/* Streak Card */}
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}08)`,
            border: `1px solid ${theme.accent}33`
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: theme.accent }}
            >
              <Flame size={24} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: theme.accent }}>Reading Streak</p>
              <p className="text-2xl font-bold" style={{ color: theme.text }}>{streak.current} <span className="text-base font-medium" style={{ color: theme.textMuted }}>days</span></p>
            </div>
          </div>
          <div className="text-right">
            <StreakFire count={streak.current} />
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Best: {streak.longest} days</p>
          </div>
        </div>

        {/* ✅ Daily Verse - FIXED with proper navigation */}
        <section aria-label="Daily Verse">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>✦ Verse of the Day</h2>
            <span className="text-xs font-medium" style={{ color: theme.textMuted }}>{format(new Date(), 'MMMM d')}</span>
          </div>
          
          {shouldShowLoading ? (
            <div
              className="rounded-2xl p-5 animate-pulse"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: theme.surface }}></div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded" style={{ backgroundColor: theme.surface }}></div>
                <div className="h-4 w-3/4 rounded" style={{ backgroundColor: theme.surface }}></div>
                <div className="h-4 w-1/2 rounded" style={{ backgroundColor: theme.surface }}></div>
              </div>
              <div className="flex justify-between mt-4">
                <div className="h-3 w-32 rounded" style={{ backgroundColor: theme.surface }}></div>
                <div className="h-3 w-20 rounded" style={{ backgroundColor: theme.surface }}></div>
              </div>
            </div>
          ) : shouldShowError ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: theme.card, border: `1px solid #dc2626` }}
            >
              <p style={{ color: '#dc2626' }}>Unable to load verse</p>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{apiError}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Retry
              </button>
            </div>
          ) : shouldShowVerse ? (
            /* ✅ Verse Card - Click to navigate to specific verse */
            <div
              className="relative rounded-2xl p-5 overflow-hidden cursor-pointer transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: `linear-gradient(145deg, #7B4F2E, #A0522D, #8B3A20)`,
              }}
              onClick={() => {
                console.log('📖 Card clicked - navigating to verse:', currentVerse.reference);
                navigateToVerse(currentVerse, false);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigateToVerse(currentVerse, false);
                }
              }}
            >
              <div className="absolute top-2 right-4 text-6xl opacity-10 select-none font-serif text-white">✝</div>

              <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-70 text-white">
                {currentVerse.translation || 'NIV'}
                {!currentVerse.isReal && ' 📖'}
              </p>
              
              <blockquote
                className="text-lg leading-relaxed mb-4 text-white"
                style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontWeight: 500 }}
              >
                "{currentVerse.text}"
              </blockquote>
              
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white opacity-90">— {currentVerse.reference}</p>
                
                {/* ✅ Read Chapter Button - Navigate to chapter start */}
                <button
                  className="flex items-center gap-1.5 text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('📖 Read Chapter clicked - navigating to chapter:', currentVerse.book, currentVerse.chapter);
                    navigateToVerse(currentVerse, true);
                  }}
                  type="button"
                >
                  <span>Read Chapter</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <p style={{ color: theme.textMuted }}>No verse available</p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Load Verse
              </button>
            </div>
          )}
        </section>

        {/* Quick Resume */}
        <section aria-label="Continue Reading">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>✦ Continue Reading</h2>
          <button
            onClick={() => navigate('reader')}
            className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-150 active:scale-[0.99] text-left"
            style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
              style={{ backgroundColor: theme.accent + '20', border: `2px solid ${theme.accent}40` }}
            >
              <BookOpen size={20} style={{ color: theme.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
                {readingPosition.book} {readingPosition.chapter}
              </p>
              <p className="text-sm truncate mt-0.5" style={{ color: theme.textMuted }}>
                {lastReadBook?.category} · {readerSettings.translation}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock size={10} style={{ color: theme.textFaint }} />
                <span className="text-xs" style={{ color: theme.textFaint }}>
                  {readingPosition.timestamp ? 'Continue where you left off' : 'Start reading'}
                </span>
              </div>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: theme.accent, color: 'white' }}
            >
              <ChevronRight size={18} />
            </div>
          </button>
        </section>

        {/* Recent Highlights */}
        {recentHighlights.length > 0 && (
          <section aria-label="Recent Highlights">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>✦ Recent Highlights</h2>
              <button
                onClick={() => navigate('bookmarks')}
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: theme.accent }}
              >
                See All <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentHighlights.map(highlight => (
                <button
                  key={highlight.id}
                  onClick={() => {
                    setReadingPosition({ 
                      book: highlight.book, 
                      bookId: highlight.bookId, 
                      chapter: highlight.chapter, 
                      verse: highlight.verse 
                    });
                    navigate('reader');
                  }}
                  className="px-3 py-2 rounded-full text-sm transition-all active:scale-[0.98]"
                  style={{ backgroundColor: theme.surface, color: theme.accent, border: `1px solid ${theme.accent}33` }}
                >
                  {highlight.book} {highlight.chapter}:{highlight.verse}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Pro Upsell */}
        {!isPro && (
          <div
            className="rounded-2xl p-5 relative overflow-hidden cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7B4F2E, #A0522D)' }}
            onClick={handleUpgradeClick}
          >
            <div className="absolute top-0 right-0 opacity-10 text-8xl font-serif text-white select-none">✦</div>
            <div className="flex items-start gap-3">
              <div className="text-3xl">⭐</div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base mb-1">Unlock Logos Pro</h3>
                <p className="text-sm text-white opacity-80 mb-3">
                  Unlimited highlights, all reading plans, verse image creator, and more.
                </p>
                <button 
                  className="bg-white text-amber-800 text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpgradeClick();
                  }}
                >
                  Start Free Trial →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <section aria-label="Quick Statistics">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>✦ Your Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Star size={18} />, label: 'Highlights', value: highlights.length, action: () => navigate('highlights') },
              { icon: <Bookmark size={18} />, label: 'Bookmarks', value: bookmarks.length, action: () => navigate('bookmarks') },
              { icon: <Target size={18} />, label: 'Notes', value: notes.length, action: () => navigate('notes') },
              { icon: <TrendingUp size={18} />, label: 'Days Read', value: streak.totalDaysRead, action: () => navigate('progress') },
            ].map(stat => (
              <button
                key={stat.label}
                onClick={stat.action}
                className="rounded-2xl p-4 text-left transition-all duration-150 active:scale-[0.99]"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center gap-2 mb-2" style={{ color: theme.accent }}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold" style={{ color: theme.text }}>{stat.value}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: theme.textMuted }}>{stat.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Study Tools */}
        <section aria-label="Study Tools">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>✦ Study Tools</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🔍', label: 'Search', action: () => navigate('search') },
              { icon: '🙏', label: 'Prayer', action: () => navigate('prayer') },
              { icon: '👥', label: 'Groups', action: () => navigate('groups') },
            ].map(tool => (
              <button
                key={tool.label}
                onClick={tool.action}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all duration-150 active:scale-[0.98]"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
              >
                <span className="text-2xl">{tool.icon}</span>
                <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>{tool.label}</span>
              </button>
            ))}
          </div>
        </section>

      </div>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        theme={theme}
      />
    </div>
  );
};

// ===== HELPER FUNCTIONS =====

function extractBookFromReference(reference: string): string {
  const match = reference.match(/^[A-Za-z\s]+(?=\s+\d+:\d+)/);
  return match ? match[0].trim() : 'John';
}

function extractChapterFromReference(reference: string): number {
  const match = reference.match(/\d+(?=:\d+)/);
  return match ? parseInt(match[0]) : 1;
}

function extractVerseFromReference(reference: string): number {
  const match = reference.match(/(?<=:)\d+/);
  return match ? parseInt(match[0]) : 1;
}

export default HomeScreen;