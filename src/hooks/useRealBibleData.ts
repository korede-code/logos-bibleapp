// src/hooks/useRealBibleData.ts

import { useEffect, useCallback, useState, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { offlineStorage } from '../services/offlineStorage';
import { bibleLocal } from '../services/bibleLocalService';

export interface Verse {
  reference: string;
  text: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
}

export interface UseBibleChapterResult {
  verses: Verse[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  progress: number;
  isOffline: boolean;
  fromCache: boolean;
}

export interface UseBibleSearchResult {
  results: Verse[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  hasMore: boolean;
}

export interface UseOfflineSyncResult {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  queueSize: number;
  sync: () => Promise<void>;
}

// ✅ Hook for fetching a chapter with local fallback
export function useBibleChapter(
  book: string,
  chapter: number,
  translation: string = 'KJV'
): UseBibleChapterResult {
  const { currentChapterVerses, fetchChapter, isApiLoading, apiError, isOnline } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    // ✅ Prevent multiple fetches
    if (hasFetchedRef.current && currentChapterVerses?.length > 0) {
      return;
    }
    
    console.log(`📖 Fetching ${book} ${chapter} (${translation})`);
    setIsLoading(true);
    setError(null);
    setProgress(10);
    hasFetchedRef.current = true;
    
    try {
      // ✅ 1. Use local KJV first (instant)
      if (translation === 'KJV' || translation === 'kjv') {
        const localChapter = bibleLocal.getChapter(book, chapter);
        if (localChapter && localChapter.verses.length > 0) {
          const verses = localChapter.verses.map(v => ({
            reference: `${v.book} ${v.chapter}:${v.verse}`,
            text: v.text,
            translation: 'KJV',
            book: v.book,
            chapter: v.chapter,
            verse: v.verse
          }));
          useAppStore.setState({ currentChapterVerses: verses });
          setFromCache(true);
          setProgress(100);
          setIsLoading(false);
          return;
        }
      }

      // ✅ 2. Try offline storage
      const cached = await offlineStorage.getChapter(book, chapter, translation);
      if (cached && cached.verses.length > 0) {
        console.log(`📦 Loaded from offline cache: ${book} ${chapter}`);
        useAppStore.setState({ currentChapterVerses: cached.verses });
        setFromCache(true);
        setProgress(100);
        setIsLoading(false);
        return;
      }
      
      // ✅ 3. Fetch from API
      setProgress(30);
      await fetchChapter(translation, book, chapter);
      
      // ✅ 4. Cache for offline use
      const verses = useAppStore.getState().currentChapterVerses;
      if (verses && verses.length > 0) {
        await offlineStorage.saveChapter(book, chapter, translation, verses);
        console.log(`💾 Cached for offline: ${book} ${chapter}`);
      }
      
      setFromCache(false);
      setProgress(100);
      console.log(`📖 Fetch complete: ${book} ${chapter}`);
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch chapter');
      
      // ✅ Fallback to local KJV
      const fallbackChapter = bibleLocal.getChapter(book, chapter);
      if (fallbackChapter && fallbackChapter.verses.length > 0) {
        const verses = fallbackChapter.verses.map(v => ({
          reference: `${v.book} ${v.chapter}:${v.verse}`,
          text: v.text,
          translation: 'KJV (Fallback)',
          book: v.book,
          chapter: v.chapter,
          verse: v.verse
        }));
        useAppStore.setState({ currentChapterVerses: verses });
        setFromCache(true);
        setProgress(100);
      }
    } finally {
      setIsLoading(false);
    }
  }, [book, chapter, translation, fetchChapter, currentChapterVerses]);

  // ✅ Use effect with proper dependencies
  useEffect(() => {
    // Reset fetch flag when book/chapter changes
    hasFetchedRef.current = false;
    fetchData();
  }, [book, chapter, translation]);

  return {
    verses: currentChapterVerses,
    isLoading: isLoading || isApiLoading,
    error: error || apiError,
    refetch: fetchData,
    progress,
    isOffline: !isOnline,
    fromCache,
  };
}

// ✅ Hook for searching
export function useBibleSearch(): UseBibleSearchResult {
  const { searchBible, searchResults, isApiLoading, apiError } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await searchBible(query);
      setHasMore(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [searchBible]);

  return {
    results: searchResults,
    isLoading: isLoading || isApiLoading,
    error: error || apiError,
    search,
    hasMore,
  };
}

// ✅ Hook for offline sync
export function useOfflineSync(): UseOfflineSyncResult {
  const { isOnline, pendingSyncCount, syncOfflineChanges } = useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const sync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOfflineChanges();
      setLastSyncTime(new Date());
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, syncOfflineChanges]);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    queueSize: pendingSyncCount,
    sync,
  };
}

// ✅ Hook for single verse
export function useBibleVerse(
  book: string,
  chapter: number,
  verseNumber: number,
  translation: string = 'KJV'
) {
  const { fetchVerse, isApiLoading, apiError, isOnline } = useAppStore();
  const [verseData, setVerseData] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // ✅ Try local KJV first
      if (translation === 'KJV' || translation === 'kjv') {
        const localVerse = bibleLocal.getVerse(book, chapter, verseNumber);
        if (localVerse) {
          setVerseData({
            reference: `${localVerse.book} ${localVerse.chapter}:${localVerse.verse}`,
            text: localVerse.text,
            translation: 'KJV',
            book: localVerse.book,
            chapter: localVerse.chapter,
            verse: localVerse.verse
          });
          setFromCache(true);
          setIsLoading(false);
          return;
        }
      }
      
      const data = await fetchVerse(translation, book, chapter, verseNumber);
      if (data) {
        setVerseData(data);
        setFromCache(false);
      } else {
        setError('No verse found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch verse');
    } finally {
      setIsLoading(false);
    }
  }, [book, chapter, verseNumber, translation, fetchVerse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    verse: verseData,
    isLoading: isLoading || isApiLoading,
    error: error || apiError,
    refetch: fetchData,
    isOffline: !isOnline,
    fromCache,
  };
}