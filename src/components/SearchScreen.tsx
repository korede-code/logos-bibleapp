// src/components/SearchScreen.tsx
/**
 * Logos Daily — Full-Text Search Screen
 * =======================================
 * Powerful Bible search with:
 * - Instant full-text search across all verses (OFFLINE)
 * - Filter by testament, book, or category
 * - Exact phrase / whole word / proximity modes
 * - Search history
 * - Result highlighting
 * 
 * 🔥 FIXED: Now searches locally using BibleLocalService (offline)
 * 🔥 FIXED: Filters are now scrollable and responsive
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, X, Filter, ChevronRight, Clock, BookOpen, ArrowLeft, WifiOff, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { BIBLE_BOOKS } from '../data/bibleData';
import { getTheme } from '../utils/themeUtils';
import { bibleLocal, BibleLocalVerse } from '../services/bibleLocalService';

type SearchMode = 'contains' | 'exact' | 'whole-word';
type TestamentFilter = 'all' | 'OT' | 'NT';

const SearchScreen: React.FC = () => {
  const { 
    readerSettings, 
    navigate, 
    searchHistory, 
    addSearchHistory, 
    setReadingPosition, 
    isOnline 
  } = useAppStore();
  
  const theme = getTheme(readerSettings.theme);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('contains');
  const [testamentFilter, setTestamentFilter] = useState<TestamentFilter>('all');
  const [bookFilter, setBookFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localResults, setLocalResults] = useState<BibleLocalVerse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [totalVerses, setTotalVerses] = useState(0);
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Check if Bible is loaded
  useEffect(() => {
    const checkBibleLoaded = () => {
      const available = bibleLocal.isAvailable();
      const count = bibleLocal.getTotalVerseCount();
      setTotalVerses(count);
      setIsLoading(false);
      console.log(`📚 Bible local service: ${available ? '✅ Loaded' : '❌ Not loaded'}, ${count} verses`);
    };
    
    checkBibleLoaded();
    
    if (!bibleLocal.isAvailable()) {
      const interval = setInterval(() => {
        if (bibleLocal.isAvailable()) {
          checkBibleLoaded();
          clearInterval(interval);
        }
      }, 500);
      
      setTimeout(() => {
        clearInterval(interval);
        setIsLoading(false);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, []);

  // Perform local search
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setLocalResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      let results: BibleLocalVerse[] = [];

      switch (mode) {
        case 'exact':
          const exactTerm = searchQuery.trim().toLowerCase();
          results = bibleLocal.search(searchQuery.trim());
          results = results.filter(v => 
            v.text.toLowerCase().includes(exactTerm)
          );
          break;
          
        case 'whole-word':
          const words = searchQuery.trim().toLowerCase().split(/\s+/);
          results = bibleLocal.search(searchQuery.trim());
          results = results.filter(v => {
            const textLower = v.text.toLowerCase();
            return words.every(word => {
              const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
              return regex.test(textLower);
            });
          });
          break;
          
        case 'contains':
        default:
          results = bibleLocal.search(searchQuery.trim());
          break;
      }

      if (testamentFilter !== 'all') {
        results = results.filter(v => {
          const book = BIBLE_BOOKS.find(b => b.name === v.book);
          return book?.testament === testamentFilter;
        });
      }

      if (bookFilter) {
        results = results.filter(v => v.book === bookFilter);
      }

      setLocalResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setLocalResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [mode, testamentFilter, bookFilter]);

  // Auto-search with debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (query.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
        if (query.trim()) {
          addSearchHistory(query.trim());
        }
      }, 300);
    } else {
      setLocalResults([]);
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch, addSearchHistory]);

  const highlightText = (text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery.trim()) return text;
    const terms = searchQuery.trim().split(/\s+/);
    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (terms.some(t => part.toLowerCase() === t.toLowerCase())) {
        return (
          <mark key={i} className="rounded" style={{ backgroundColor: `${theme.accent}33`, color: theme.text, fontWeight: 700 }}>
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // Get unique books from results for filter UI
  const availableBooks = useMemo(() => {
    const books = new Set(localResults.map(r => r.book));
    return Array.from(books).sort();
  }, [localResults]);

  const displayResults = localResults;
  const hasResults = displayResults.length > 0;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Fixed Header */}
      <div className="flex-shrink-0 px-5 pt-6 pb-3" style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.bg }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('home')} style={{ color: theme.textMuted }} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
            Search Scripture
          </h1>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: theme.textMuted }}>
            {isLoading ? '📚 Loading Bible data...' : 
             totalVerses > 0 ? `📚 ${totalVerses.toLocaleString()} verses available offline` : 
             '📚 No Bible data loaded'}
          </span>
          {!isOnline && (
            <span className="text-xs flex items-center gap-1" style={{ color: '#f59e0b' }}>
              <WifiOff size={12} /> Offline
            </span>
          )}
        </div>

        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
        >
          <Search size={18} style={{ color: theme.accent }} />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isLoading ? 'Loading Bible data...' : 'Search any word or phrase...'}
            className="flex-1 bg-transparent outline-none font-medium"
            style={{ color: theme.text, fontSize: '15px' }}
            autoFocus
            aria-label="Search Bible text"
            autoCapitalize="none"
            disabled={isLoading}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: theme.textMuted }} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
          
          <button
            onClick={() => performSearch(query)}
            className="px-3 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: theme.accent, color: 'white' }}
            aria-label="Search"
            disabled={!query.trim() || query.trim().length < 2 || isLoading}
          >
            <Search size={16} />
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-1.5 rounded-lg transition-all flex-shrink-0"
            style={{
              backgroundColor: showFilters ? theme.accent : 'transparent',
              color: showFilters ? 'white' : theme.textMuted,
            }}
            aria-label="Toggle filters"
            aria-pressed={showFilters}
          >
            <Filter size={15} />
          </button>
        </div>

        {/* 🔥 Scrollable Filters - Now inside a scrollable container */}
        {showFilters && (
          <div 
            ref={filtersRef}
            className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-2"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: `${theme.border} transparent`,
            }}
            aria-label="Search filters"
          >
            {/* Search Mode */}
            <div className="flex gap-2">
              {[
                { id: 'contains' as SearchMode, label: 'Contains' },
                { id: 'exact' as SearchMode, label: 'Exact' },
                { id: 'whole-word' as SearchMode, label: 'Whole Word' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: mode === m.id ? theme.accent : theme.surface,
                    color: mode === m.id ? 'white' : theme.textMuted,
                  }}
                  aria-pressed={mode === m.id}
                  aria-label={`${m.label} search mode`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Testament Filter */}
            <div className="flex gap-2">
              {[
                { id: 'all' as TestamentFilter, label: 'All' },
                { id: 'OT' as TestamentFilter, label: 'Old Testament' },
                { id: 'NT' as TestamentFilter, label: 'New Testament' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTestamentFilter(t.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: testamentFilter === t.id ? `${theme.accent}22` : theme.surface,
                    color: testamentFilter === t.id ? theme.accent : theme.textMuted,
                    border: `1px solid ${testamentFilter === t.id ? theme.accent : theme.border}`,
                  }}
                  aria-pressed={testamentFilter === t.id}
                  aria-label={`Filter by ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Book Filter - with scrolling for many books */}
            {availableBooks.length > 0 && (
              <div className="mt-1">
                <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                  Filter by Book
                </label>
                <select
                  value={bookFilter || ''}
                  onChange={(e) => setBookFilter(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                  aria-label="Filter by book"
                >
                  <option value="">All Books</option>
                  {availableBooks.map(book => (
                    <option key={book} value={book}>{book}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Result count - moved here */}
        {query.trim().length >= 2 && !isLoading && (
          <p className="text-xs font-medium mt-2 pl-1" style={{ color: theme.textMuted }}>
            {displayResults.length} {displayResults.length === 1 ? 'result' : 'results'} found
            {displayResults.length === 0 && ' — try a different keyword'}
          </p>
        )}
      </div>

      {/* 🔥 Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-3">

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 size={32} className="animate-spin" style={{ color: theme.accent }} />
            <p className="text-sm" style={{ color: theme.textMuted }}>Loading Bible data...</p>
          </div>
        )}

        {/* Search History (shown when no query) */}
        {!isLoading && !query && searchHistory.length > 0 && (
          <section aria-label="Recent searches">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
              ✦ Recent Searches
            </h2>
            <div className="space-y-1">
              {searchHistory.slice(0, 8).map(item => (
                <button
                  key={item}
                  onClick={() => setQuery(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{ backgroundColor: theme.surface }}
                  aria-label={`Search for "${item}"`}
                >
                  <Clock size={14} style={{ color: theme.textFaint }} />
                  <span className="text-sm font-medium" style={{ color: theme.text }}>{item}</span>
                  <ChevronRight size={14} className="ml-auto" style={{ color: theme.textFaint }} />
                </button>
              ))}
            </div>

            {/* Suggested Topics */}
            <h2 className="text-xs font-bold uppercase tracking-widest mt-5 mb-3" style={{ color: theme.textMuted }}>
              ✦ Topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {['love', 'faith', 'hope', 'grace', 'peace', 'joy', 'pray', 'forgive', 'salvation', 'wisdom', 'strength', 'light'].map(topic => (
                <button
                  key={topic}
                  onClick={() => setQuery(topic)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize"
                  style={{
                    backgroundColor: `${theme.accent}18`,
                    color: theme.accent,
                    border: `1px solid ${theme.accent}33`,
                  }}
                  aria-label={`Search for "${topic}"`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Search Results */}
        {!isLoading && query.trim().length >= 2 && hasResults && (
          <div className="space-y-3" role="list" aria-label="Search results">
            {displayResults.map((result, idx) => (
              <button
                key={`${result.book}-${result.chapter}-${result.verse}-${idx}`}
                onClick={() => {
                  const book = BIBLE_BOOKS.find(b => b.name === result.book);
                  setReadingPosition({
                    book: result.book,
                    bookId: book?.id || 1,
                    chapter: result.chapter,
                    verse: result.verse,
                  });
                  navigate('reader');
                }}
                className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.99]"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                role="listitem"
                aria-label={`${result.book} ${result.chapter}:${result.verse}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={12} style={{ color: theme.accent }} />
                  <span className="text-xs font-bold" style={{ color: theme.accent }}>
                    {result.book} {result.chapter}:{result.verse}
                  </span>
                  <span
                    className="ml-auto text-xs px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: theme.surface, color: theme.textFaint }}
                  >
                    {result.translation || 'KJV'}
                  </span>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: theme.text,
                    fontFamily: `${readerSettings.fontFamily}, serif`,
                    lineHeight: 1.6,
                  }}
                >
                  {highlightText(result.text, query)}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && query.trim().length >= 2 && !hasResults && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-5xl">🔍</div>
            <div className="text-center">
              <p className="font-bold mb-1" style={{ color: theme.text }}>No results found</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                Try a different keyword or adjust your filters
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['love', 'faith', 'peace', 'hope'].map(s => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium capitalize"
                  style={{ backgroundColor: `${theme.accent}18`, color: theme.accent }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-20" />
      </div>
    </div>
  );
};

export default SearchScreen;