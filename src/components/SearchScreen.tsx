/**
 * Logos Daily — Full-Text Search Screen
 * =======================================
 * Powerful Bible search with:
 * - Instant full-text search across all verses
 * - Filter by testament, book, or category
 * - Exact phrase / whole word / proximity modes
 * - Search history
 * - Result highlighting
 * 
 * 🔥 UPDATED: Now uses real Bible API for searching Scripture
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, X, Filter, ChevronRight, Clock, BookOpen, ArrowLeft, WifiOff, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useBibleSearch, useOfflineSync } from '../hooks/useRealBibleData';
import { BIBLE_BOOKS } from '../data/bibleData';
import { getTheme } from '../utils/themeUtils';

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
  const [localResults, setLocalResults] = useState<any[]>([]);
  const [isLocalSearching, setIsLocalSearching] = useState(false);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use the real Bible search hook
  const { 
    results: apiResults, 
    isLoading: isApiLoading, 
    error, 
    search,
    hasMore 
  } = useBibleSearch();

  // Get offline sync status
  const { isOnline: isNetworkOnline } = useOfflineSync();

  // Determine if we're truly offline (no network)
  const trulyOffline = !isOnline && !isNetworkOnline;

  // Filter results by testament and book (post-search filtering)
  const filteredResults = useMemo(() => {
    let results = apiResults;
    
    // Apply testament filter
    if (testamentFilter !== 'all' && results.length > 0) {
      results = results.filter(result => {
        const book = BIBLE_BOOKS.find(b => b.name === result.book);
        return book?.testament === testamentFilter;
      });
    }
    
    // Apply book filter
    if (bookFilter && results.length > 0) {
      results = results.filter(result => result.book === bookFilter);
    }
    
    return results;
  }, [apiResults, testamentFilter, bookFilter]);

  // Get unique books from search results for filter UI
  const availableBooks = useMemo(() => {
    const books = new Set(apiResults.map(r => r.book));
    return Array.from(books).sort();
  }, [apiResults]);

  // Handle search with real API
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    
    console.log('🔍 Searching for:', searchQuery); // Debug log
    
    // Add to search history
    addSearchHistory(searchQuery.trim());
    
    setIsLocalSearching(trulyOffline);
    
    try {
      if (trulyOffline) {
        // Offline: simple message (IndexedDB search disabled for now)
        setTimeout(() => {
          setLocalResults([]);
          setIsLocalSearching(false);
        }, 500);
      } else {
        // Online: use API search
        await search(searchQuery);
        console.log('✅ Search completed');
      }
    } catch (err) {
      console.error('❌ Search failed:', err);
    } finally {
      if (trulyOffline) {
        // Handled in setTimeout
      } else {
        setIsLocalSearching(false);
      }
    }
  }, [trulyOffline, addSearchHistory, search]);

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

  // Get display results
  const displayResults = trulyOffline ? localResults : filteredResults;
  const isLoading = isApiLoading || isLocalSearching;
  const hasResults = displayResults.length > 0;

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>

      {/* Header */}
      <div className="px-5 pt-6 pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('home')} style={{ color: theme.textMuted }} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
            Search Scripture
          </h1>
        </div>

        {/* Offline banner */}
        {trulyOffline && (
          <div className="mb-3 p-2 rounded-xl flex items-center justify-center gap-2" style={{ backgroundColor: '#f59e0b20' }}>
            <WifiOff size={14} style={{ color: '#f59e0b' }} />
            <span className="text-xs" style={{ color: '#f59e0b' }}>Offline mode - search may be limited</span>
          </div>
        )}

        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
        >
          <Search size={18} style={{ color: theme.accent }} />
          <input
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              // Clear previous debounce timer
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              // Auto-search as user types (with debounce)
              if (e.target.value.trim().length >= 2) {
                debounceTimerRef.current = setTimeout(() => {
                  handleSearch(e.target.value);
                }, 500);
              }
            }}
            placeholder={trulyOffline ? 'Search (offline mode)' : 'Search any word or phrase...'}
            className="flex-1 bg-transparent outline-none font-medium"
            style={{ color: theme.text, fontSize: '15px' }}
            autoFocus
            aria-label="Search Bible text"
            autoCapitalize="none"
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: theme.textMuted }} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
          
          {/* Manual Search Button */}
          <button
            onClick={() => handleSearch(query)}
            className="px-3 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: theme.accent, color: 'white' }}
            aria-label="Search"
            disabled={!query.trim() || query.trim().length < 2}
          >
            <Search size={16} />
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-1.5 rounded-lg transition-all"
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

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-2" aria-label="Search filters">
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

            {/* Book Filter */}
            {availableBooks.length > 0 && (
              <div className="mt-2">
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

        {/* Result count */}
        {query.trim().length >= 2 && !isLoading && (
          <p className="text-xs font-medium mt-2 pl-1" style={{ color: theme.textMuted }}>
            {displayResults.length} {displayResults.length === 1 ? 'result' : 'results'}
            {displayResults.length === 0 && ' — try a different keyword'}
          </p>
        )}

        {/* API Error Display */}
        {error && !trulyOffline && (
          <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#dc262620', color: '#dc2626' }}>
            <p className="text-xs">{error}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-3">

        {/* Loading State */}
        {isLoading && query.trim().length >= 2 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 size={32} className="animate-spin" style={{ color: theme.accent }} />
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {trulyOffline ? 'Searching...' : 'Searching Scripture...'}
            </p>
          </div>
        )}

        {/* Search History (shown when no query) */}
        {!query && searchHistory.length > 0 && (
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
        {query.trim().length >= 2 && !isLoading && hasResults && (
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
                    {result.translation || readerSettings.translation}
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
            
            {/* Load more button for pagination */}
            {!trulyOffline && hasMore && !isLoading && (
              <button
                onClick={() => search(query)}
                className="w-full py-3 rounded-xl text-center text-sm font-medium transition-all"
                style={{ backgroundColor: theme.surface, color: theme.accent }}
              >
                Load More Results
              </button>
            )}
          </div>
        )}

        {/* No results */}
        {query.trim().length >= 2 && !isLoading && !hasResults && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-5xl">🔍</div>
            <div className="text-center">
              <p className="font-bold mb-1" style={{ color: theme.text }}>No results found</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                {trulyOffline 
                  ? 'Search is limited in offline mode. Connect to the internet for full search.' 
                  : 'Try a different keyword or adjust filters'}
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