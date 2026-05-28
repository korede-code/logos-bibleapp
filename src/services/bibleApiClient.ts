/**
 * Bible API Client Service
 * =========================
 * Handles all communication with the Bible API backend.
 * Implements caching, retry logic, and offline support.
 */

// Configuration

// Ensure TypeScript knows about import.meta.env (Vite)
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_API_URL?: string;
      // add other env vars here if needed
      [key: string]: unknown;
    };
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://logos-daily-backend.onrender.com/api';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Types
export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  source?: string;
  cached?: boolean;
  timestamp?: string;
}

export interface VerseOfTheDayResponse {
  reference: string;
  text: string;
  translation: string;
}

export interface SearchResult {
  reference: string;
  text: string;
  relevance?: number;
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
}

/**
 * Bible API Client Class
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
    options: RequestInit = {},
    useCache: boolean = true,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${url}`;

    // Check cache first
    if (useCache) {
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

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Cache successful responses
        if (useCache && data.success !== false) {
          this.cache.set(cacheKey, data);
        }

        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);

        // Retry logic for network errors
        if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
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
   * Get Verse of the Day
   */
  async getVerseOfTheDay(random: boolean = false) {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const url = random 
        ? `/bible/votd?random=true&_=${timestamp}` 
        : `/bible/votd?_=${timestamp}`;
      
      console.log(`📡 Fetching VOTD from: ${url}`);
      const response = await this.request(url, {}, false); // Force no cache
      console.log(`📥 VOTD response:`, response);
      return response;
    } catch (error) {
      console.error('Failed to fetch VOTD:', error);
      return {
        success: true,
        data: {
          reference: 'John 3:16',
          text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
          translation: 'KJV'
        }
      };
    }
  }

  /**
   * Get a specific chapter
   */
  async getChapter(
    translation: string,
    book: string,
    chapter: number
  ): Promise<BibleApiResponse & { data?: BibleVerse[] }> {
    try {
      const endpoint = `/bible/${translation}/${book}/${chapter}`;
      const response = await this.request<BibleApiResponse>(endpoint);
      return response;
    } catch (error) {
      console.error(`Failed to fetch chapter ${book} ${chapter}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get a specific verse
   */
  async getVerse(
    translation: string,
    book: string,
    chapter: number,
    verse: number
  ): Promise<BibleApiResponse & { data?: BibleVerse[] }> {
    try {
      const endpoint = `/bible/${translation}/${book}/${chapter}/${verse}`;
      const response = await this.request<BibleApiResponse>(endpoint);
      return response;
    } catch (error) {
      console.error(`Failed to fetch verse ${book} ${chapter}:${verse}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search the Bible
   */
  async search(
    query: string,
    translation: string = 'KJV'
  ): Promise<BibleApiResponse & { results?: SearchResult[]; query?: string; count?: number }> {
    try {
      const endpoint = `/bible/search?q=${encodeURIComponent(query)}&translation=${translation}`;
      const response = await this.request<BibleApiResponse>(endpoint);
      return response;
    } catch (error) {
      console.error('Search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get available translations
   */
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

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 API cache cleared');
  }

  /**
   * Check if API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
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
      return response;
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }
}

// Export a singleton instance
export const bibleApi = new BibleApiClient();

// Export the class for testing
export default BibleApiClient;