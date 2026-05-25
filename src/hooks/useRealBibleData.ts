/**
 * Real Bible Data Hook
 * ====================
 * Simplified custom hooks for accessing Bible API data
 */

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';

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
 * Hook for fetching an entire chapter
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
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      setProgress(30);
      await fetchChapter(translation, book, chapter);
      setProgress(100);
      setFromCache(false);
    } catch (err) {
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
      setHasMore(false); // API doesn't support pagination yet
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