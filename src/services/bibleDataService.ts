// Real Bible data service that replaces the mock DAILY_VERSES
import { bibleApi } from './bibleApiClient';

export interface RealVerse {
  reference: string;
  text: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
}

class BibleDataService {
  private verseCache: Map<string, RealVerse> = new Map();
  
  // Get verse of the day from API
  async getVerseOfTheDay(): Promise<RealVerse> {
    // Check cache first
    const today = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem(`votd_${today}`);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      const response = await bibleApi.getVerseOfTheDay();
      if (response.success && response.data) {
        const verseData = {
          reference: response.data.reference,
          text: response.data.text,
          translation: response.data.translation,
          book: this.extractBook(response.data.reference),
          chapter: this.extractChapter(response.data.reference),
          verse: this.extractVerse(response.data.reference)
        };
        
        // Cache for the day
        localStorage.setItem(`votd_${today}`, JSON.stringify(verseData));
        return verseData;
      }
      throw new Error('No VOTD from API');
    } catch (error) {
      console.error('API failed, using fallback verse', error);
      return this.getFallbackVerse();
    }
  }
  
  // Get a specific verse
  async getVerse(book: string, chapter: number, verse: number, translation: string = 'KJV'): Promise<RealVerse> {
    const cacheKey = `${translation}:${book}:${chapter}:${verse}`;
    
    if (this.verseCache.has(cacheKey)) {
      return this.verseCache.get(cacheKey)!;
    }
    
    try {
      const response = await bibleApi.getVerse(translation, book, chapter, verse);
      if (response.success && response.data && response.data[0]) {
        const verseData = {
          reference: `${book} ${chapter}:${verse}`,
          text: response.data[0].text,
          translation: translation,
          book: book,
          chapter: chapter,
          verse: verse
        };
        
        this.verseCache.set(cacheKey, verseData);
        return verseData;
      }
      throw new Error('Verse not found');
    } catch (error) {
      console.error(`Failed to fetch ${book} ${chapter}:${verse}`, error);
      return this.getFallbackVerse();
    }
  }
  
  // Search scripture
  async searchScripture(query: string, translation: string = 'KJV'): Promise<RealVerse[]> {
    try {
      const response = await bibleApi.search(query, translation);
      if (response.success && response.results) {
        return response.results.map((result: any) => ({
          reference: result.reference,
          text: result.text,
          translation: translation,
          book: this.extractBook(result.reference),
          chapter: this.extractChapter(result.reference),
          verse: this.extractVerse(result.reference)
        }));
      }
      return [];
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }
  
  // Helper methods
  private extractBook(reference: string): string {
    const match = reference.match(/^[A-Za-z\s]+(?=\s\d+)/);
    return match ? match[0].trim() : 'John';
  }
  
  private extractChapter(reference: string): number {
    const match = reference.match(/\d+(?=:\d+)/);
    return match ? parseInt(match[0]) : 3;
  }
  
  private extractVerse(reference: string): number {
    const match = reference.match(/(?<=:)\d+/);
    return match ? parseInt(match[0]) : 16;
  }
  
  private getFallbackVerse(): RealVerse {
    return {
      reference: 'John 3:16',
      text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      translation: 'KJV',
      book: 'John',
      chapter: 3,
      verse: 16
    };
  }
}

export const bibleDataService = new BibleDataService();