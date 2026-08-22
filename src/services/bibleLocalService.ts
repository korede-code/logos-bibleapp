// src/services/bibleLocalService.ts
import kjvBible from '../data/bible-kjv.json';

export interface BibleLocalVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

export interface BibleLocalChapter {
  book: string;
  chapter: number;
  verses: BibleLocalVerse[];
}

class BibleLocalService {
  private bible: any;
  private isLoaded = false;
  private allVerses: BibleLocalVerse[] = [];
  private books: string[] = [];
  private totalVerses = 0;
  private chapterCache: Map<string, BibleLocalChapter> = new Map();

  constructor() {
    this.loadBible();
  }

  private loadBible() {
    try {
      this.bible = kjvBible;
      this.isLoaded = true;
      
      this.books = Object.keys(this.bible);
      this.totalVerses = this.indexAllVerses();
      this.preCacheAllChapters();
      
      console.log(`✅ Local KJV Bible loaded: ${this.books.length} books, ${this.totalVerses} verses`);
    } catch (error) {
      console.error('❌ Failed to load local Bible:', error);
      this.isLoaded = false;
    }
  }

  private preCacheAllChapters() {
    console.log('📦 Pre-caching all chapters...');
    let chapterCount = 0;
    for (const book of this.books) {
      const bookData = this.bible[book];
      const chapters = Object.keys(bookData);
      for (const chapter of chapters) {
        const chapterData = this.getChapter(book, parseInt(chapter));
        if (chapterData) {
          const cacheKey = `${book}:${chapter}`;
          this.chapterCache.set(cacheKey, chapterData);
          chapterCount++;
        }
      }
    }
    console.log(`✅ Pre-cached ${chapterCount} chapters`);
  }

  private indexAllVerses(): number {
    let count = 0;
    for (const [book, chapters] of Object.entries(this.bible)) {
      for (const [chapter, verses] of Object.entries(chapters as any)) {
        for (const [verse, text] of Object.entries(verses as any)) {
          this.allVerses.push({
            book,
            chapter: parseInt(chapter),
            verse: parseInt(verse),
            text: text as string,
            translation: 'KJV'
          });
          count++;
        }
      }
    }
    return count;
  }

  isAvailable(): boolean {
    return this.isLoaded;
  }

  getBooks(): string[] {
    return this.books;
  }

  getTotalVerseCount(): number {
    return this.totalVerses;
  }

  getChapter(book: string, chapter: number): BibleLocalChapter | null {
    if (!this.isLoaded) return null;

    const cacheKey = `${book}:${chapter}`;
    if (this.chapterCache.has(cacheKey)) {
      return this.chapterCache.get(cacheKey)!;
    }

    try {
      const bookData = this.bible[book];
      if (!bookData) {
        console.warn(`Book "${book}" not found in local Bible`);
        return null;
      }

      const chapterData = bookData[chapter.toString()];
      if (!chapterData) {
        console.warn(`Chapter ${chapter} not found in ${book}`);
        return null;
      }

      const verses: BibleLocalVerse[] = [];
      for (const [verseNum, text] of Object.entries(chapterData)) {
        verses.push({
          book,
          chapter,
          verse: parseInt(verseNum),
          text: text as string,
          translation: 'KJV'
        });
      }

      const result = {
        book,
        chapter,
        verses: verses.sort((a, b) => a.verse - b.verse)
      };

      this.chapterCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting chapter:', error);
      return null;
    }
  }

  getVerse(book: string, chapter: number, verse: number): BibleLocalVerse | null {
    if (!this.isLoaded) return null;

    try {
      const bookData = this.bible[book];
      if (!bookData) return null;

      const chapterData = bookData[chapter.toString()];
      if (!chapterData) return null;

      const verseText = chapterData[verse.toString()];
      if (!verseText) return null;

      return {
        book,
        chapter,
        verse,
        text: verseText,
        translation: 'KJV'
      };
    } catch (error) {
      console.error('Error getting verse:', error);
      return null;
    }
  }

  getVerseOfTheDay(): BibleLocalVerse | null {
    if (!this.isLoaded || this.allVerses.length === 0) return null;

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const index = dayOfYear % this.allVerses.length;
    return this.allVerses[index];
  }

  getRandomVerse(): BibleLocalVerse | null {
    if (!this.isLoaded || this.allVerses.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.allVerses.length);
    return this.allVerses[randomIndex];
  }

  search(query: string): BibleLocalVerse[] {
    if (!this.isLoaded) return [];
    
    const results: BibleLocalVerse[] = [];
    const searchTerm = query.toLowerCase();
    const maxResults = 100;

    for (const verse of this.allVerses) {
      if (verse.text.toLowerCase().includes(searchTerm)) {
        results.push(verse);
        if (results.length >= maxResults) break;
      }
    }

    return results;
  }

  // ✅ New methods for checking existence
  bookExists(book: string): boolean {
    return this.bible && this.bible[book] !== undefined;
  }

  chapterExists(book: string, chapter: number): boolean {
    if (!this.bible || !this.bible[book]) return false;
    return this.bible[book][chapter.toString()] !== undefined;
  }

  verseExists(book: string, chapter: number, verse: number): boolean {
    if (!this.bible || !this.bible[book]) return false;
    const chapterData = this.bible[book][chapter.toString()];
    if (!chapterData) return false;
    return chapterData[verse.toString()] !== undefined;
  }

  getVerseCount(book: string, chapter: number): number {
    if (!this.isLoaded) return 0;
    const bookData = this.bible[book];
    if (!bookData) return 0;
    const chapterData = bookData[chapter.toString()];
    if (!chapterData) return 0;
    return Object.keys(chapterData).length;
  }

  getVersesByBook(book: string): BibleLocalVerse[] {
    if (!this.isLoaded) return [];
    return this.allVerses.filter(v => v.book === book);
  }

  parseReference(reference: string): { book: string; chapter: number; verse: number } | null {
    const match = reference.match(/^([A-Za-z\s]+)\s+(\d+):(\d+)$/);
    if (!match) return null;
    return {
      book: match[1].trim(),
      chapter: parseInt(match[2]),
      verse: parseInt(match[3])
    };
  }

  getVerseByReference(reference: string): BibleLocalVerse | null {
    const parsed = this.parseReference(reference);
    if (!parsed) return null;
    return this.getVerse(parsed.book, parsed.chapter, parsed.verse);
  }
}

export const bibleLocal = new BibleLocalService();
export default BibleLocalService;