// src/services/bibleApiClient.ts

/**
 * Bible API Client Service
 * =========================
 * Handles all communication with the Bible API backend.
 * Implements caching, retry logic, and offline support with local KJV fallback.
 */
import { CapacitorHttp } from '@capacitor/core';
import { bibleLocal, BibleLocalVerse } from './bibleLocalService';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://logos-daily-backend.onrender.com/api';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

console.log('🔧 Bible API Client initialized with URL:', API_BASE_URL);

// Types
export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
}

export interface BibleApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  source?: string; // 'local' | 'api' | 'cache'
  cached?: boolean;
  timestamp?: string;
}

export interface VerseOfTheDayResponse {
  reference: string;
  text: string;
  translation: string;
  book?: string;
  chapter?: number;
  verse?: number;
}

export interface SearchResult {
  reference: string;
  text: string;
  relevance?: number;
  book?: string;
  chapter?: number;
  verse?: number;
}

export interface ChapterResponse {
  verses: BibleVerse[];
  translation: string;
  source: string;
}

/**
 * Simple in-memory cache for API responses
 */
class ApiCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultTTL = 3600000; // 1 hour in milliseconds

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Bible API Client Class
 * Handles all Bible data operations with local KJV fallback
 */
class BibleApiClient {
  private cache: ApiCache;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor() {
    this.cache = new ApiCache();
  }

  /**
   * Generic request method with retry logic and caching
   */
  private async request<T>(
    endpoint: string,
    options: any = {},
    useCache: boolean = true,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const cacheKey = `${method}:${url}`;

    // Check cache first
    if (useCache && method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit: ${endpoint}`);
        return cached;
      }
    }

    // Check for pending duplicate request
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for pending request: ${endpoint}`);
      return this.pendingRequests.get(cacheKey) as Promise<T>;
    }

    const requestPromise = (async () => {
      try {
        // Use CapacitorHttp instead of fetch
        const response = await CapacitorHttp.request({
          url,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          data: options.body ? JSON.parse(options.body) : undefined,
          connectTimeout: REQUEST_TIMEOUT,
          readTimeout: REQUEST_TIMEOUT,
        });

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`API Error: ${response.status} ${response.statusText || ''}`);
        }

        const data = response.data;

        // Cache successful responses
        if (useCache && method === 'GET' && data.success !== false) {
          this.cache.set(cacheKey, data);
        }

        return data;
      } catch (error: any) {
        // Retry logic for network errors
        if (retries > 0 && (error.message?.includes('timeout') || error.message?.includes('network'))) {
          console.log(`🔄 Retrying request (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}): ${endpoint}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return this.request(endpoint, options, useCache, retries - 1);
        }

        throw error;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Get Verse of the Day - uses local KJV first for instant access
   */
  async getVerseOfTheDay(random: boolean = false): Promise<BibleApiResponse> {
    // ✅ Use local Bible for KJV (instant, no API call)
    const localVerse = bibleLocal.getVerseOfTheDay();
    if (localVerse) {
      console.log('📖 Using local KJV verse:', localVerse.book, localVerse.chapter, localVerse.verse);
      return {
        success: true,
        data: {
          reference: `${localVerse.book} ${localVerse.chapter}:${localVerse.verse}`,
          text: localVerse.text,
          translation: localVerse.translation || 'KJV',
          book: localVerse.book,
          chapter: localVerse.chapter,
          verse: localVerse.verse
        },
        source: 'local'
      };
    }

    // Fallback to API
    try {
      const timestamp = Date.now();
      const url = random 
        ? `/bible/votd?random=true&_=${timestamp}` 
        : `/bible/votd?_=${timestamp}`;
      
      console.log(`📡 Fetching VOTD from API: ${url}`);
      const response = await this.request<any>(url, {}, false);
      
      // Mark source if successful
      if (response?.success !== false) {
        return {
          ...response,
          source: 'api'
        };
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch VOTD:', error);
      return this.getFallbackVerse();
    }
  }

  // Update the getChapter method to use your local backend
  async getChapter(translation: string, book: string, chapter: number) {
    try {
      const endpoint = `/api/bible/${translation}/${book}/${chapter}`;
      console.log(`📡 Fetching chapter: ${endpoint}`);
      const response = await this.request(endpoint);
      return response;
    } catch (error) {
      console.error('Failed to fetch chapter:', error);
      return { success: false, error: 'Failed to fetch chapter' };
    }
  }

  // Update translations endpoint
  async getTranslations(): Promise<BibleApiResponse> {
    try {
      const response = await this.request<BibleApiResponse>('/bible/translations');
      return response;
    } catch (error) {
      console.error('Failed to fetch translations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

   //Get multiple verses at once 
  async getVerses(
    translation: string,
    verses: Array<{ book: string; chapter: number; verse: number }>
  ): Promise<BibleApiResponse> {
    // For KJV, try local first
    if (translation === 'KJV' || translation === 'kjv') {
      const localVerses = verses
        .map(v => bibleLocal.getVerse(v.book, v.chapter, v.verse))
        .filter((v): v is BibleLocalVerse => v !== null);
      
      if (localVerses.length > 0) {
        return {
          success: true,
          data: localVerses.map(v => ({
            book: v.book,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text,
          })),
          translation: 'KJV',
          source: 'local'
        };
      }
    }

    // Fallback to API - batch request
    try {
      const endpoint = `/bible/${translation}/verses`;
      const response = await this.request<BibleApiResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ verses }),
      });
      return {
        ...response,
        source: 'api'
      };
    } catch (error) {
      console.error('Failed to fetch verses:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch verses' 
      };
    }
  }

  /**
   * Search the Bible - uses local KJV first
   */
  async search(
    query: string,
    translation: string = 'KJV'
  ): Promise<BibleApiResponse & { results?: SearchResult[]; query?: string; count?: number }> {
    if (translation === 'KJV' || translation === 'kjv') {
      const results = bibleLocal.search(query);
      if (results.length > 0) {
        console.log(`📖 Local search found ${results.length} results`);
        return {
          success: true,
          results: results.map(v => ({
            reference: `${v.book} ${v.chapter}:${v.verse}`,
            text: v.text,
            book: v.book,
            chapter: v.chapter,
            verse: v.verse,
          })),
          count: results.length,
          query,
          source: 'local'
        };
      }
    }

    try {
      const endpoint = `/bible/search?q=${encodeURIComponent(query)}&translation=${translation}`;
      console.log(`📡 Searching API: ${endpoint}`);
      const response = await this.request<BibleApiResponse & { results?: SearchResult[]; count?: number }>(endpoint);
      return {
        ...response,
        source: 'api'
      };
    } catch (error) {
      console.error('Search failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      };
    }
  }

  /**
   * Get available translations
   */
  async getTranslations(): Promise<BibleApiResponse> {
    try {
      const response = await this.request<BibleApiResponse>('/bible/translations');
      return {
        ...response,
        source: 'api'
      };
    } catch (error) {
      console.error('Failed to fetch translations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get random verse
   */
  async getRandomVerse(translation: string = 'KJV'): Promise<BibleApiResponse> {
    if (translation === 'KJV' || translation === 'kjv') {
      const localVerse = bibleLocal.getRandomVerse();
      if (localVerse) {
        return {
          success: true,
          data: {
            book: localVerse.book,
            chapter: localVerse.chapter,
            verse: localVerse.verse,
            text: localVerse.text,
          },
          translation: 'KJV',
          source: 'local'
        };
      }
    }

    try {
      const endpoint = `/bible/${translation}/random`;
      const response = await this.request<BibleApiResponse>(endpoint);
      return {
        ...response,
        source: 'api'
      };
    } catch (error) {
      console.error('Failed to fetch random verse:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch random verse' 
      };
    }
  }

  /**
   * Get books of the Bible
   */
  async getBooks(translation: string = 'KJV'): Promise<BibleApiResponse> {
    if (translation === 'KJV' || translation === 'kjv') {
      const books = bibleLocal.getBooks();
      return {
        success: true,
        data: books,
        source: 'local'
      };
    }

    try {
      const endpoint = `/bible/${translation}/books`;
      const response = await this.request<BibleApiResponse>(endpoint);
      return {
        ...response,
        source: 'api'
      };
    } catch (error) {
      console.error('Failed to fetch books:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch books' 
      };
    }
  }

  /**
   * Get book info
   */
  async getBookInfo(book: string): Promise<BibleApiResponse> {
    try {
      const endpoint = `/bible/book/${encodeURIComponent(book)}`;
      const response = await this.request<BibleApiResponse>(endpoint);
      return {
        ...response,
        source: 'api'
      };
    } catch (error) {
      console.error('Failed to fetch book info:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch book info' 
      };
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 API cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }

  /**
   * Check if API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await CapacitorHttp.get({
        url: `${API_BASE_URL}/health`,
        connectTimeout: 5000,
        readTimeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Sync offline changes (batch operation)
   */
  async syncOfflineData(operations: Array<{ type: string; data: any }>): Promise<BibleApiResponse> {
    try {
      const response = await this.request<BibleApiResponse>('/sync', {
        method: 'POST',
        body: JSON.stringify({ operations }),
      });
      return {
        ...response,
        source: 'api'
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Get fallback verse when everything fails
   */
  private getFallbackVerse(): BibleApiResponse {
    return {
      success: true,
      data: {
        reference: 'John 3:16',
        text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
        translation: 'KJV',
        book: 'John',
        chapter: 3,
        verse: 16
      },
      source: 'local'
    };
  }

  /**
   * Check if local KJV data is available
   */
  isLocalKJVAvailable(): boolean {
    return bibleLocal.isAvailable();
  }

  /**
   * Get local KJV statistics
   */
  getLocalStats(): { 
    available: boolean; 
    totalVerses: number; 
    books: string[];
  } {
    const books = bibleLocal.getBooks();
    return {
      available: books.length > 0,
      totalVerses: bibleLocal.getTotalVerseCount(),
      books: books,
    };
  }
}

// Export a singleton instance
export const bibleApi = new BibleApiClient();

// Export the class for testing
export default BibleApiClient;