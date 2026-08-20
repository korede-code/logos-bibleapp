// backend/services/BibleService.js
const fs = require('fs');
const path = require('path');

class BibleService {
  constructor() {
    this.bibles = {};
    this.translations = [];
    this.loadBibles();
  }

  loadBibles() {
    const translationsDir = path.join(__dirname, '../data/translations');
    
    if (!fs.existsSync(translationsDir)) {
      console.log('⚠️ Translations directory not found');
      return;
    }

    const files = fs.readdirSync(translationsDir);
    
    // Clear arrays to avoid duplicates
    this.bibles = {};
    this.translations = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const translation = file.replace('.json', '');
        try {
          const data = JSON.parse(fs.readFileSync(path.join(translationsDir, file), 'utf8'));
          this.bibles[translation] = data;
          this.translations.push(translation);
          const bookCount = Object.keys(data).length;
          console.log(`✅ Loaded ${translation}: ${bookCount} books`);
        } catch (error) {
          console.error(`❌ Failed to load ${translation}:`, error.message);
        }
      }
    }
    
    console.log(`📚 Loaded ${this.translations.length} translations: ${this.translations.join(', ')}`);
  }

  getChapter(translation, book, chapter) {
    const bible = this.bibles[translation];
    if (!bible) {
      console.log(`⚠️ Translation ${translation} not found, trying KJV...`);
      return this.getChapter('KJV', book, chapter);
    }
    
    const bookData = bible[book];
    if (!bookData) {
      console.log(`⚠️ Book ${book} not found in ${translation}`);
      return null;
    }
    
    const chapterData = bookData[chapter];
    if (!chapterData) {
      console.log(`⚠️ Chapter ${chapter} not found in ${book}`);
      return null;
    }
    
    const verses = [];
    for (const [verseNum, text] of Object.entries(chapterData)) {
      verses.push({
        book,
        chapter: parseInt(chapter),
        verse: parseInt(verseNum),
        text: text,
        translation: translation
      });
    }
    
    return verses.sort((a, b) => a.verse - b.verse);
  }

  getVerse(translation, book, chapter, verse) {
    const chapterData = this.getChapter(translation, book, chapter);
    if (!chapterData) return null;
    return chapterData.find(v => v.verse === verse) || null;
  }

  search(translation, query) {
    const bible = this.bibles[translation] || this.bibles['KJV'];
    if (!bible) return [];
    
    const results = [];
    const searchTerm = query.toLowerCase();
    
    for (const [book, chapters] of Object.entries(bible)) {
      for (const [chapter, verses] of Object.entries(chapters)) {
        for (const [verse, text] of Object.entries(verses)) {
          if (text.toLowerCase().includes(searchTerm)) {
            results.push({
              reference: `${book} ${chapter}:${verse}`,
              text: text,
              book: book,
              chapter: parseInt(chapter),
              verse: parseInt(verse),
              translation: translation
            });
            if (results.length >= 100) break;
          }
        }
        if (results.length >= 100) break;
      }
      if (results.length >= 100) break;
    }
    
    return results;
  }

  // ✅ FIXED: Returns ALL translations with correct Pro status
  getAvailableTranslations() {
    // Define ALL translations with their Pro status
    const allTranslations = [
      // Free translations (public domain)
      { code: 'KJV', name: 'King James Version', requiresPro: false },
      { code: 'ASV', name: 'American Standard Version', requiresPro: false },
      { code: 'WEB', name: 'World English Bible', requiresPro: false },
      { code: 'BBE', name: 'Bible in Basic English', requiresPro: false },
      { code: 'DARBY', name: 'Darby Translation', requiresPro: false },
      { code: 'YLT', name: "Young's Literal Translation", requiresPro: false },
      
      // Pro translations (require subscription)
      { code: 'ESV', name: 'English Standard Version', requiresPro: true },
      { code: 'NASB', name: 'New American Standard Bible', requiresPro: true },
      { code: 'NIV', name: 'New International Version', requiresPro: true },
      { code: 'NLT', name: 'New Living Translation', requiresPro: true },
      { code: 'CSB', name: 'Christian Standard Bible', requiresPro: true },
      { code: 'NKJV', name: 'New King James Version', requiresPro: true }
    ];

    // Map each translation to check if it's available locally
    return allTranslations.map(trans => ({
      code: trans.code,
      name: trans.name,
      available: this.bibles[trans.code] ? true : false,
      requiresPro: trans.requiresPro
    }));
  }

  isProTranslation(code) {
    const proTranslations = ['ESV', 'NASB', 'NIV', 'NLT', 'CSB', 'NKJV'];
    return proTranslations.includes(code);
  }
}

module.exports = new BibleService();