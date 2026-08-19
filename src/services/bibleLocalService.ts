// src/services/bibleLocalService.ts
import kjvBible from '../data/bible-kjv.json';

export interface LocalVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

export interface LocalChapter {
  book: string;
  chapter: number;
  verses: LocalVerse[];
}

class BibleLocalService {
  private bible: any = kjvBible;

  constructor() {
    console.log('📖 Loading Bible data...');
    const bookCount = Object.keys(this.bible).length;
    console.log(`📖 Found ${bookCount} books: ${Object.keys(this.bible).join(', ')}`);
    console.log(`✅ Local KJV Bible loaded: ${bookCount} books`);
  }

  getChapter(book: string, chapter: number): LocalChapter | null {
    try {
      const bookData = this.bible[book];
      if (!bookData) return null;

      const chapterData = bookData[chapter.toString()];
      if (!chapterData) return null;

      const verses: LocalVerse[] = [];
      for (const [verseNum, text] of Object.entries(chapterData)) {
        verses.push({
          book,
          chapter,
          verse: parseInt(verseNum),
          text: text as string,
          translation: 'KJV'
        });
      }

      return {
        book,
        chapter,
        verses: verses.sort((a, b) => a.verse - b.verse)
      };
    } catch (error) {
      console.error('Error getting chapter:', error);
      return null;
    }
  }

  getVerse(book: string, chapter: number, verse: number): LocalVerse | null {
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

  getVerseOfTheDay(): LocalVerse | null {
    try {
      const books = Object.keys(this.bible);
      const randomBook = books[Math.floor(Math.random() * books.length)];
      const bookData = this.bible[randomBook];
      
      const chapters = Object.keys(bookData);
      const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];
      const chapterData = bookData[randomChapter];
      
      const verses = Object.keys(chapterData);
      const randomVerse = verses[Math.floor(Math.random() * verses.length)];
      
      return {
        book: randomBook,
        chapter: parseInt(randomChapter),
        verse: parseInt(randomVerse),
        text: chapterData[randomVerse],
        translation: 'KJV'
      };
    } catch (error) {
      console.error('Error getting verse of the day:', error);
      return null;
    }
  }

  search(query: string): LocalVerse[] {
    const results: LocalVerse[] = [];
    const searchTerm = query.toLowerCase();

    try {
      for (const [bookName, bookData] of Object.entries(this.bible)) {
        for (const [chapterNum, chapterData] of Object.entries(bookData as any)) {
          for (const [verseNum, verseText] of Object.entries(chapterData as any)) {
            if ((verseText as string).toLowerCase().includes(searchTerm)) {
              results.push({
                book: bookName,
                chapter: parseInt(chapterNum),
                verse: parseInt(verseNum),
                text: verseText as string,
                translation: 'KJV'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching Bible:', error);
    }

    return results;
  }
}

export const bibleLocal = new BibleLocalService();