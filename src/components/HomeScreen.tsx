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
 * 🔥 UPDATED: Now uses real Bible API for Verse of the Day
 * 🔥 FIXED: Start Free Trial button now works
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen, Bookmark, Flame, Star, ChevronRight,
  Sun, Cloud, CloudRain, Target,
  TrendingUp, Clock, Wifi, Bell, RefreshCw, Crown
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { READING_PLANS, BIBLE_BOOKS } from '../data/bibleData';
import { getTheme } from '../utils/themeUtils';
import { format } from 'date-fns';
import { bibleApi } from '../services/bibleApiClient';
import ProUpgradeModal from './ProUpgradeModal';
import { auth } from '../config/firebase';

const HomeScreen: React.FC = () => {
  const {
    navigate, readerSettings, readingPosition, streak,
    activePlans, highlights, bookmarks,
    notes, isPro, setReadingPosition,
    realVerseOfTheDay,
    isApiLoading,
    apiError,
    fetchRealVerseOfTheDay,
    isOnline
  } = useAppStore();

  const theme = getTheme(readerSettings.theme);
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [refreshing, setRefreshing] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch real verse of the day on mount
  useEffect(() => {
    fetchRealVerseOfTheDay();
  }, [fetchRealVerseOfTheDay]);

  // Handle manual refresh
  const handleRefresh = async () => {
    console.log('🔄 Refresh button clicked - fetching random verse');
    setRefreshing(true);
    try {
      localStorage.removeItem('votd_random');
      const timestamp = Date.now();
      const response = await bibleApi.getVerseOfTheDay(true);
      
      console.log('📥 API Response:', response);
      
      if (response.success && response.data) {
        useAppStore.setState({ 
          realVerseOfTheDay: response.data,
          isApiLoading: false 
        });
        console.log('✅ New verse loaded:', response.data.reference);
        
        // Show toast notification
        const toast = document.createElement('div');
        toast.textContent = `✨ New verse: ${response.data.reference}`;
        toast.style.cssText = `
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          background: #4CAF50; color: white; padding: 10px 20px;
          border-radius: 10px; z-index: 1000; font-size: 14px;
          animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      } else {
        throw new Error('No verse data');
      }
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      const toast = document.createElement('div');
      toast.textContent = 'Failed to refresh verse. Please try again.';
      toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #e53935; color: white; padding: 10px 20px;
        border-radius: 10px; z-index: 1000; font-size: 14px;
        animation: fadeInUp 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Pro upgrade button click
  const handleUpgradeClick = () => {
    if (!currentUser) {
      // If not logged in, navigate to settings to sign in first
      navigate('settings');
      const toast = document.createElement('div');
      toast.textContent = 'Please sign in first to upgrade to Pro';
      toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #f59e0b; color: white; padding: 10px 20px;
        border-radius: 10px; z-index: 1000; font-size: 14px;
        animation: fadeInUp 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } else {
      setShowProModal(true);
    }
  };

  // When clicking a bookmark, navigate to the specific verse
  const handleBookmarkClick = (bookmark: {
    bookId: number;
    book: string;
    chapter: number;
    verse: number;
    label: string;
  }) => {
    // Set the reading position with the exact verse from the bookmark
    setReadingPosition({
      book: bookmark.book,
      bookId: bookmark.bookId,
      chapter: bookmark.chapter,
      verse: bookmark.verse, // Make sure this is set correctly
    });
    navigate('reader');
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

  const greetingIcon = { morning: <Sun size={18} />, afternoon: <Cloud size={18} />, evening: <CloudRain size={18} />, night: <Star size={18} /> }[timeOfDay];

  const lastReadBook = BIBLE_BOOKS.find(b => b.id === readingPosition.bookId);

  // Get recent highlights (last 3)
  const recentHighlights = highlights.slice(-3).reverse();

  const StreakFire = ({ count }: { count: number }) => (
    <div className="flex items-center gap-1">
      {[...Array(Math.min(count, 7))].map((_, i) => (
        <div key={i} className="relative" style={{ opacity: Math.max(0.3, 1 - (Math.min(count, 7) - 1 - i) * 0.12) }}>
          <Flame size={16} style={{ color: i === Math.min(count, 7) - 1 ? '#FF6B35' : '#FFA500' }} />
        </div>
      ))}
    </div>
  );

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
              Logos Daily
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Online/Offline status indicator */}
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
            {/* Pro Badge */}
            {isPro && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                <Crown size={10} />
                PRO
              </div>
            )}
            {/* Refresh button */}
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

      {/* Offline warning banner */}
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

        {/* Daily Verse */}
        <section aria-label="Daily Verse">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>✦ Verse of the Day</h2>
            <span className="text-xs font-medium" style={{ color: theme.textMuted }}>{format(new Date(), 'MMMM d')}</span>
          </div>
          
          {/* Loading state */}
          {isApiLoading && !realVerseOfTheDay ? (
            <div
              className="rounded-2xl p-8 flex items-center justify-center"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: `${theme.accent} transparent ${theme.accent} transparent` }} />
            </div>
          ) : apiError && !realVerseOfTheDay ? (
            /* Error state */
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: theme.card, border: `1px solid #dc2626` }}
            >
              <p style={{ color: '#dc2626' }}>Unable to load verse</p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Retry
              </button>
            </div>
          ) : realVerseOfTheDay ? (
            /* Display real verse from API */
            <div
              className="relative rounded-2xl p-5 overflow-hidden cursor-pointer active:scale-[0.99] transition-all duration-150"
              style={{
                background: `linear-gradient(145deg, #7B4F2E, #A0522D, #8B3A20)`,
              }}
              onClick={() => {
                const bookData = BIBLE_BOOKS.find(b => 
                  b.name.toLowerCase() === realVerseOfTheDay.book.toLowerCase() ||
                  realVerseOfTheDay.reference.toLowerCase().startsWith(b.name.toLowerCase())
                );
                if (bookData) {
                  setReadingPosition({ 
                    book: realVerseOfTheDay.book, 
                    bookId: bookData.id, 
                    chapter: realVerseOfTheDay.chapter, 
                    verse: realVerseOfTheDay.verse 
                  });
                }
                navigate('reader');
              }}
              aria-label={`Daily verse: ${realVerseOfTheDay.reference}`}
              role="button"
              tabIndex={0}
            >
              <div className="absolute top-2 right-4 text-6xl opacity-10 select-none font-serif text-white">✝</div>

              <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-70 text-white">
                {realVerseOfTheDay.translation}
              </p>
              <blockquote
                className="text-lg leading-relaxed mb-4 text-white"
                style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontWeight: 500 }}
              >
                "{realVerseOfTheDay.text}"
              </blockquote>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white opacity-90">— {realVerseOfTheDay.reference}</p>
                <div className="flex items-center gap-1.5 text-white opacity-70 text-xs">
                  <span>Read Chapter</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            </div>
          ) : (
            /* Fallback if no verse data */
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
            aria-label={`Continue reading ${readingPosition.book} chapter ${readingPosition.chapter}`}
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

        {/* Recent Highlights Section */}
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
              {recentHighlights.map(highlight => {
                const colorMap: Record<string, string> = {
                  yellow: '#F0B400', green: '#38A060', blue: '#3A6CB0',
                  pink: '#C04080', purple: '#8040CC', orange: '#D06020'
                };
                return (
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
                );
              })}
            </div>
          </section>
        )}

        {/* Pro Upsell - NOW WITH WORKING BUTTON */}
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
              { icon: <Star size={18} />, label: 'Highlights', value: highlights.length, action: () => navigate('bookmarks') },
              { icon: <Bookmark size={18} />, label: 'Bookmarks', value: bookmarks.length, action: () => navigate('bookmarks') },
              { icon: <Target size={18} />, label: 'Notes', value: notes.length, action: () => navigate('notes') },
              { icon: <TrendingUp size={18} />, label: 'Days Read', value: streak.totalDaysRead, action: () => navigate('progress') },
            ].map(stat => (
              <button
                key={stat.label}
                onClick={stat.action}
                className="rounded-2xl p-4 text-left transition-all duration-150 active:scale-[0.99]"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                aria-label={`${stat.label}: ${stat.value}`}
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

        {/* Study Tools Quick Access */}
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
                aria-label={tool.label}
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
        userEmail={currentUser?.email || ''}
        userId={currentUser?.uid || ''}
        onSuccess={() => {
          setShowProModal(false);
        }}
        themeMode={readerSettings.theme}
      />
    </div>
  );
};

export default HomeScreen;