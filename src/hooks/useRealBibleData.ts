/**
 * Real Bible Data Hook
 * ====================
 * Simplified custom hooks for accessing Bible API data
 * Now with offline caching support!
 */

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { offlineStorage } from '../services/offlineStorage';

// Types
export interface Verse {
  reference: string;
  text: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
}

export interface UseBibleVerseResult {
  verse: Verse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isOffline: boolean;
  fromCache: boolean;
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

/**
 * Hook for fetching a single verse
 */
export function useBibleVerse(
  book: string,
  chapter: number,
  verseNumber: number,
  translation: string = 'KJV'
): UseBibleVerseResult {
  const { fetchVerse, isApiLoading, apiError, isOnline } = useAppStore();
  const [verseData, setVerseData] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try cache first
      const cached = await offlineStorage.getChapter(book, chapter, translation);
      if (cached) {
        const cachedVerse = cached.verses.find((v: any) => v.verse === verseNumber);
        if (cachedVerse) {
          setVerseData(cachedVerse);
          setFromCache(true);
          setIsLoading(false);
          return;
        }
      }
      
      // Fetch from API
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

/**
 * Hook for fetching an entire chapter (with offline caching)
 */
export function useBibleChapter(
  book: string,
  chapter: number,
  translation: string = 'KJV'
): UseBibleChapterResult {
  const { currentChapterVerses, fetchChapter, isApiLoading, apiError, isOnline } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    console.log(`📖 Fetching ${book} ${chapter} (${translation})`);
    setIsLoading(true);
    setError(null);
    setProgress(10);
    
    try {
      // ✅ 1. Try offline cache first
      const cached = await offlineStorage.getChapter(book, chapter, translation);
      
      if (cached && cached.verses.length > 0) {
        console.log(`📦 Loaded from offline cache: ${book} ${chapter}`);
        useAppStore.setState({ currentChapterVerses: cached.verses });
        setFromCache(true);
        setProgress(100);
        setIsLoading(false);
        return;
      }
      
      // ✅ 2. Fetch from API
      setProgress(30);
      await fetchChapter(translation, book, chapter);
      
      // ✅ 3. Cache for offline use
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
    } finally {
      setIsLoading(false);
    }
  }, [book, chapter, translation, fetchChapter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

/**
 * Hook for searching the Bible
 */
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

/**
 * Hook for checking offline status
 */
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