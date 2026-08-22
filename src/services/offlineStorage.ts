// src/services/offlineStorage.ts
interface CachedChapter {
  book: string;
  chapter: number;
  translation: string;
  verses: Array<{
    book: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
  cachedAt: number;
}

class OfflineStorage {
  private dbName = 'logos_daily_offline';
  private storeName = 'chapters';
  private db: IDBDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized && this.db) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('✅ OfflineStorage initialized');
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ OfflineStorage init failed:', request.error);
        reject(request.error);
      };
    });
  }

  private getKey(book: string, chapter: number, translation: string): string {
    return `${translation}:${book}:${chapter}`;
  }

  async saveChapter(book: string, chapter: number, translation: string, verses: any[]): Promise<void> {
    try {
      if (!this.initialized) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const data: CachedChapter & { id: string } = {
          id: this.getKey(book, chapter, translation),
          book,
          chapter,
          translation,
          verses: verses.map(v => ({
            book: v.book || book,
            chapter: v.chapter || chapter,
            verse: v.verse,
            text: v.text
          })),
          cachedAt: Date.now(),
        };
        
        store.put(data);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('⚠️ OfflineStorage save failed:', error);
      // Don't throw - we can still function without offline storage
    }
  }

  async getChapter(book: string, chapter: number, translation: string): Promise<CachedChapter | null> {
    try {
      if (!this.initialized) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(this.getKey(book, chapter, translation));
        
        request.onsuccess = () => {
          const result = request.result;
          if (result && (Date.now() - result.cachedAt < 7 * 24 * 60 * 60 * 1000)) {
            resolve(result);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('⚠️ OfflineStorage get failed:', error);
      return null;
    }
  }

  async getCachedBooks(): Promise<string[]> {
    try {
      if (!this.initialized) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const books = [...new Set(request.result.map((r: any) => r.book))];
          resolve(books);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('⚠️ OfflineStorage getCachedBooks failed:', error);
      return [];
    }
  }

  async getStorageSize(): Promise<number> {
    try {
      if (!this.initialized) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const totalSize = request.result.reduce((acc: number, r: any) => {
            return acc + JSON.stringify(r).length;
          }, 0);
          resolve(totalSize);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return 0;
    }
  }

  async clearAll(): Promise<void> {
    try {
      if (!this.initialized) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('⚠️ OfflineStorage clear failed:', error);
    }
  }

  async isChapterCached(book: string, chapter: number, translation: string): Promise<boolean> {
    const cached = await this.getChapter(book, chapter, translation);
    return cached !== null;
  }
}

export const offlineStorage = new OfflineStorage();