/**
 * Offline Storage Service
 * ========================
 * Manages IndexedDB for offline-first functionality.
 * Provides persistent storage for verses, highlights, notes, and sync queue.
 * 
 * Features:
 * - Automatic database initialization
 * - CRUD operations with Promise-based API
 * - Sync queue for offline changes
 * - Automatic cleanup of expired cache
 */

// Database configuration
const DB_NAME = 'LogosDaily';
const DB_VERSION = 2; // Incremented to add new stores
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Store names
export const STORES = {
  VERSES: 'verses',
  CHAPTERS: 'chapters',
  HIGHLIGHTS: 'highlights',
  NOTES: 'notes',
  BOOKMARKS: 'bookmarks',
  SYNC_QUEUE: 'syncQueue',
  PRAYERS: 'prayers',
  READING_HISTORY: 'readingHistory',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

// Type definitions for stored data
export interface StoredVerse {
  id: string; // format: "translation:book:chapter:verse"
  reference: string;
  text: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  timestamp: number;
}

export interface StoredChapter {
  id: string; // format: "translation:book:chapter"
  verses: StoredVerse[];
  translation: string;
  book: string;
  chapter: number;
  timestamp: number;
  expiresAt: number;
}

export interface StoredHighlight {
  id: string;
  verseId: string;
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  color: string;
  style: 'highlight' | 'underline';
  userId?: string;
  synced: boolean;
  vectorClock: number;
  createdAt: number;
  updatedAt: number;
}

export interface StoredNote {
  id: string;
  verseId: string;
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  title: string;
  content: string;
  tags: string[];
  synced: boolean;
  vectorClock: number;
  createdAt: number;
  updatedAt: number;
}

export interface StoredBookmark {
  id: string;
  verseId: string;
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  label: string;
  synced: boolean;
  createdAt: number;
}

export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  entityType: 'highlight' | 'note' | 'bookmark' | 'prayer';
  entityId: string;
  payload: any;
  retryCount: number;
  timestamp: number;
}

export interface StoredPrayer {
  id: string;
  title: string;
  body: string;
  status: 'praying' | 'answered' | 'archived';
  answeredAt?: number;
  tags: string[];
  synced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StoredReadingHistory {
  id: string; // format: "YYYY-MM-DD"
  date: string;
  durationMinutes: number;
  chaptersRead: number;
  versesRead: number;
  books: string[];
  synced: boolean;
}

/**
 * IndexedDB Service Class
 */
class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Offline storage initialized');
        
        // Handle database close/reopen
        this.db.onclose = () => {
          console.log('Database closed, reinitializing...');
          this.db = null;
          this.initPromise = null;
        };
        
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('Upgrading database to version', DB_VERSION);

        // Verses store - individual verses
        if (!db.objectStoreNames.contains(STORES.VERSES)) {
          const verseStore = db.createObjectStore(STORES.VERSES, { keyPath: 'id' });
          verseStore.createIndex('translation', 'translation', { unique: false });
          verseStore.createIndex('book', 'book', { unique: false });
          verseStore.createIndex('reference', 'reference', { unique: false });
          verseStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Chapters store - full chapters for faster loading
        if (!db.objectStoreNames.contains(STORES.CHAPTERS)) {
          const chapterStore = db.createObjectStore(STORES.CHAPTERS, { keyPath: 'id' });
          chapterStore.createIndex('translation', 'translation', { unique: false });
          chapterStore.createIndex('book', 'book', { unique: false });
          chapterStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Highlights store
        if (!db.objectStoreNames.contains(STORES.HIGHLIGHTS)) {
          const highlightStore = db.createObjectStore(STORES.HIGHLIGHTS, { keyPath: 'id' });
          highlightStore.createIndex('verseId', 'verseId', { unique: false });
          highlightStore.createIndex('bookId', 'bookId', { unique: false });
          highlightStore.createIndex('synced', 'synced', { unique: false });
          highlightStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Notes store
        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          const noteStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
          noteStore.createIndex('verseId', 'verseId', { unique: false });
          noteStore.createIndex('bookId', 'bookId', { unique: false });
          noteStore.createIndex('synced', 'synced', { unique: false });
          noteStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Bookmarks store
        if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
          const bookmarkStore = db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'id' });
          bookmarkStore.createIndex('verseId', 'verseId', { unique: false });
          bookmarkStore.createIndex('bookId', 'bookId', { unique: false });
          bookmarkStore.createIndex('synced', 'synced', { unique: false });
          bookmarkStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('operation', 'operation', { unique: false });
          syncStore.createIndex('entityType', 'entityType', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('retryCount', 'retryCount', { unique: false });
        }

        // Prayers store
        if (!db.objectStoreNames.contains(STORES.PRAYERS)) {
          const prayerStore = db.createObjectStore(STORES.PRAYERS, { keyPath: 'id' });
          prayerStore.createIndex('status', 'status', { unique: false });
          prayerStore.createIndex('synced', 'synced', { unique: false });
          prayerStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Reading history store
        if (!db.objectStoreNames.contains(STORES.READING_HISTORY)) {
          const historyStore = db.createObjectStore(STORES.READING_HISTORY, { keyPath: 'id' });
          historyStore.createIndex('date', 'date', { unique: false });
          historyStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

   // Ensure database is initialized before operations
  private async ensureDB(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

   // Generic get operation
  async get<T>(storeName: StoreName, key: string): Promise<T | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

   // Generic put operation
  async put<T>(storeName: StoreName, value: T, key?: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = key ? store.put(value, key) : store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

   // Generic delete operation
  async delete(storeName: StoreName, key: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

   // Get all items from a store (with optional index filtering)
  async getAll<T>(storeName: StoreName, indexName?: string, indexValue?: any): Promise<T[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      let request: IDBRequest;
      if (indexName && indexValue !== undefined) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

   // Get all verses (for offline search)
  async getAllVerses(): Promise<StoredVerse[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.VERSES, 'readonly');
      const store = transaction.objectStore(STORES.VERSES);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

   // Save a verse to offline storage
  async saveVerse(verse: StoredVerse): Promise<void> {
    await this.put(STORES.VERSES, verse);
  }

   // Get a verse by ID
  async getVerse(translation: string, book: string, chapter: number, verse: number): Promise<StoredVerse | null> {
    const id = `${translation}:${book}:${chapter}:${verse}`;
    return this.get<StoredVerse>(STORES.VERSES, id);
  }

   // Save an entire chapter
  async saveChapter(translation: string, book: string, chapter: number, verses: StoredVerse[]): Promise<void> {
    const id = `${translation}:${book}:${chapter}`;
    const chapterData: StoredChapter = {
      id,
      verses,
      translation,
      book,
      chapter,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
    };
    await this.put(STORES.CHAPTERS, chapterData);
  }

   // Get a chapter from offline storage
  async getChapter(translation: string, book: string, chapter: number): Promise<StoredChapter | null> {
    const id = `${translation}:${book}:${chapter}`;
    const data = await this.get<StoredChapter>(STORES.CHAPTERS, id);
    
    // Check if expired
    if (data && data.expiresAt < Date.now()) {
      await this.delete(STORES.CHAPTERS, id);
      return null;
    }
    
    return data;
  }

   // Get verses by book (for search)
  async getVersesByBook(translation: string, book: string): Promise<StoredVerse[]> {
    const allVerses = await this.getAll<StoredVerse>(STORES.VERSES);
    return allVerses.filter(v => v.translation === translation && v.book === book);
  }

   // Save a highlight
  async saveHighlight(highlight: StoredHighlight): Promise<void> {
    await this.put(STORES.HIGHLIGHTS, highlight);
  }

   // Get all highlights for a verse
  async getHighlightsForVerse(verseId: string): Promise<StoredHighlight[]> {
    const allHighlights = await this.getAll<StoredHighlight>(STORES.HIGHLIGHTS);
    return allHighlights.filter(h => h.verseId === verseId);
  }

   // Get all highlights for a chapter
  async getHighlightsForChapter(bookId: number, chapter: number): Promise<StoredHighlight[]> {
    const allHighlights = await this.getAll<StoredHighlight>(STORES.HIGHLIGHTS);
    return allHighlights.filter(h => h.bookId === bookId && h.chapter === chapter);
  }

   // Delete a highlight
  async deleteHighlight(id: string): Promise<void> {
    await this.delete(STORES.HIGHLIGHTS, id);
  }

   // Get unsynced highlights
  async getUnsyncedHighlights(): Promise<StoredHighlight[]> {
    const allHighlights = await this.getAll<StoredHighlight>(STORES.HIGHLIGHTS);
    return allHighlights.filter(h => !h.synced);
  }

   // Save a note
  async saveNote(note: StoredNote): Promise<void> {
    await this.put(STORES.NOTES, note);
  }

   // Get note by ID
  async getNote(id: string): Promise<StoredNote | null> {
    return this.get<StoredNote>(STORES.NOTES, id);
  }

   // Get all notes for a verse
  async getNotesForVerse(verseId: string): Promise<StoredNote[]> {
    const allNotes = await this.getAll<StoredNote>(STORES.NOTES);
    return allNotes.filter(n => n.verseId === verseId);
  }

   // Delete a note
  async deleteNote(id: string): Promise<void> {
    await this.delete(STORES.NOTES, id);
  }

   // Get unsynced notes
  async getUnsyncedNotes(): Promise<StoredNote[]> {
    const allNotes = await this.getAll<StoredNote>(STORES.NOTES);
    return allNotes.filter(n => !n.synced);
  }

   // Save a bookmark
  async saveBookmark(bookmark: StoredBookmark): Promise<void> {
    await this.put(STORES.BOOKMARKS, bookmark);
  }

   // Get all bookmarks
  async getAllBookmarks(): Promise<StoredBookmark[]> {
    return this.getAll<StoredBookmark>(STORES.BOOKMARKS);
  }

   // Delete a bookmark
  async deleteBookmark(id: string): Promise<void> {
    await this.delete(STORES.BOOKMARKS, id);
  }

   // Add item to sync queue
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'timestamp'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      
      const queueItem: SyncQueueItem = {
        ...item,
        retryCount: 0,
        timestamp: Date.now(),
      };
      
      const request = store.add(queueItem);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

   // Get all pending sync items
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const items = await this.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

   // Remove item from sync queue
  async removeFromSyncQueue(id: number): Promise<void> {
    await this.delete(STORES.SYNC_QUEUE, id.toString());
  }

   // Update retry count for sync item
  async incrementRetryCount(id: number): Promise<void> {
    const item = await this.get<SyncQueueItem>(STORES.SYNC_QUEUE, id.toString());
    if (item) {
      item.retryCount += 1;
      await this.put(STORES.SYNC_QUEUE, item);
    }
  }

   // Clear all synced items from queue
  async clearSyncedQueue(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save a prayer
  async savePrayer(prayer: StoredPrayer): Promise<void> {
    await this.put(STORES.PRAYERS, prayer);
  }

   // Get all prayers
  async getAllPrayers(): Promise<StoredPrayer[]> {
    return this.getAll<StoredPrayer>(STORES.PRAYERS);
  }

   // Delete a prayer
  async deletePrayer(id: string): Promise<void> {
    await this.delete(STORES.PRAYERS, id);
  }

   // Save reading session
  async saveReadingSession(session: StoredReadingHistory): Promise<void> {
    await this.put(STORES.READING_HISTORY, session);
  }

   // Get reading history for a date range
  async getReadingHistory(startDate: string, endDate: string): Promise<StoredReadingHistory[]> {
    const allHistory = await this.getAll<StoredReadingHistory>(STORES.READING_HISTORY);
    return allHistory.filter(h => h.date >= startDate && h.date <= endDate);
  }

   // Clear expired cache
  async clearExpiredCache(): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CHAPTERS, 'readwrite');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const index = store.index('expiresAt');
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);
      
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

   // Get storage usage info
  async getStorageInfo(): Promise<{ used: number; limit: number; percentUsed: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        limit: estimate.quota || 0,
        percentUsed: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
      };
    }
    return { used: 0, limit: 0, percentUsed: 0 };
  }

   // Clear all data (logout)
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    const stores = Object.values(STORES);
    
    for (const store of stores) {
      const transaction = db.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      await new Promise((resolve, reject) => {
        const request = objectStore.clear();
        request.onsuccess = () => resolve(null);
        request.onerror = () => reject(request.error);
      });
    }
    
    console.log('🗑️ All offline data cleared');
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();

// Auto-initialize
if (typeof window !== 'undefined') {
  offlineStorage.init().catch(console.error);
  
  // Periodic cache cleanup (every hour)
  setInterval(() => {
    offlineStorage.clearExpiredCache().then(count => {
      if (count > 0) console.log(`🧹 Cleared ${count} expired cache entries`);
    });
  }, 60 * 60 * 1000);
}