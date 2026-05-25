import React, { useState, useEffect } from 'react';
import {
  BookOpen, Bookmark, Flame, Star, ChevronRight,
  Sun, Cloud, CloudRain, Target,
  TrendingUp, Clock, Wifi, Bell, RefreshCw
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useRealBibleData } from '../hooks/useRealBibleData';
import { BIBLE_BOOKS } from '../data/bibleData';
import { getTheme } from '../utils/themeUtils';
import { format } from 'date-fns';

const HomeScreenReal: React.FC = () => {
  const {
    navigate, readerSettings, readingPosition, streak,
    activePlans, highlights, bookmarks, notes, isPro,
    setReadingPosition, fetchVerseOfTheDay, verseOfTheDay
  } = useAppStore();

  const theme = getTheme(readerSettings.theme);
  const { loading, error } = useRealBibleData();
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning'); 
      setTimeOfDay('morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon'); 
      setTimeOfDay('afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good Evening'); 
      setTimeOfDay('evening');
    } else {
      setGreeting('Good Night'); 
      setTimeOfDay('night');
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVerseOfTheDay();
    setRefreshing(false);
  };

  const greetingIcon = { 
    morning: <Sun size={18} />, 
    afternoon: <Cloud size={18} />, 
    evening: <CloudRain size={18} />, 
    night: <Star size={18} /> 
  }[timeOfDay];

  const lastReadBook = BIBLE_BOOKS.find(b => b.id === readingPosition.bookId);
  const today = format(new Date(), 'MMMM d');

  // Calculate daily reading progress
  const dailyGoal = 5; // 5 chapters per day goal
  const readToday = 3; // This would come from your reading history

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
            <h1 className="text-2xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
              Logos Daily
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              aria-label="Refresh verse"
            >
              <RefreshCw size={16} style={{ color: theme.textMuted }} className={refreshing ? 'animate-spin' : ''} />
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

      <div className="px-5 pb-24 space-y-6 mt-4">

        {/* Daily Goal Progress */}
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={16} style={{ color: theme.accent }} />
              <span className="text-sm font-medium">Daily Goal</span>
            </div>
            <span className="text-xs" style={{ color: theme.textMuted }}>
              {readToday}/{dailyGoal} chapters
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(readToday / dailyGoal) * 100}%`,
                backgroundColor: theme.accent
              }}
            />
          </div>
        </div>

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
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: theme.accent }}>
                Reading Streak
              </p>
              <p className="text-2xl font-bold" style={{ color: theme.text }}>
                {streak.current} <span className="text-base font-medium" style={{ color: theme.textMuted }}>days</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              {[...Array(Math.min(streak.current, 7))].map((_, i) => (
                <Flame key={i} size={14} style={{ color: i === Math.min(streak.current, 7) - 1 ? '#FF6B35' : '#FFA500' }} />
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Best: {streak.longest} days</p>
          </div>
        </div>

        {/* Verse of the Day - REAL API DATA */}
        <section aria-label="Daily Verse">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
              ✦ Verse of the Day
            </h2>
            <span className="text-xs font-medium" style={{ color: theme.textMuted }}>{today}</span>
          </div>
          
          {loading ? (
            <div
              className="rounded-2xl p-8 flex items-center justify-center"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: `${theme.accent} transparent ${theme.accent} transparent` }} />
            </div>
          ) : error ? (
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
          ) : verseOfTheDay && (
            <div
              className="relative rounded-2xl p-5 overflow-hidden cursor-pointer active:scale-[0.99] transition-all duration-150"
              style={{
                background: `linear-gradient(145deg, #7B4F2E, #A0522D, #8B3A20)`,
              }}
              onClick={() => {
                const bookData = BIBLE_BOOKS.find(b => 
                  b.name === verseOfTheDay.book || 
                  verseOfTheDay.reference.startsWith(b.name)
                );
                if (bookData) {
                  setReadingPosition({ 
                    book: verseOfTheDay.book, 
                    bookId: bookData.id, 
                    chapter: verseOfTheDay.chapter, 
                    verse: verseOfTheDay.verse 
                  });
                  navigate('reader');
                }
              }}
            >
              <div className="absolute top-2 right-4 text-6xl opacity-10 select-none font-serif text-white">✝</div>
              
              <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-70 text-white">
                {verseOfTheDay.translation}
              </p>
              <blockquote
                className="text-lg leading-relaxed mb-4 text-white"
                style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontWeight: 500 }}
              >
                "{verseOfTheDay.text}"
              </blockquote>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white opacity-90">— {verseOfTheDay.reference}</p>
                <div className="flex items-center gap-1.5 text-white opacity-70 text-xs">
                  <span>Read Chapter</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Quick Resume */}
        <section aria-label="Continue Reading">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
            ✦ Continue Reading
          </h2>
          <button
            onClick={() => navigate('reader')}
            className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-150 active:scale-[0.99] text-left"
            style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${theme.accent}20`, border: `2px solid ${theme.accent}40` }}
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

        {/* Stats Section - Keep as is */}
        <section aria-label="Quick Statistics">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
            ✦ Your Stats
          </h2>
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

        {/* Rest of your existing sections remain the same */}
        {/* ... Reading Plans, Recent Highlights, Pro Upsell, Study Tools ... */}
        
      </div>
    </div>
  );
};

export default HomeScreenReal;