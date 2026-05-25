const axios = require('axios');

class BibleApiService {
  constructor() {
    this.apis = {
      bible4u: 'https://bible4u.net/api/v1',
      holybible: 'https://holybible.dev/api',
      esv: 'https://api.esv.org/v3',
      apiBible: 'https://rest.api.bible/v1'
    };
  }

  /**
   * Fetch from bible4u.net (Free, no API key needed)
   * Supports KJV, ASV, YLT, BBE
   */
  async fetchFromBible4u(translation, book, chapter, verse = null) {
    try {
      // Capitalize first letter of book
      const formattedBook = book.charAt(0).toUpperCase() + book.slice(1).toLowerCase();
      
      let url;
      if (verse) {
        // Single verse
        url = `${this.apis.bible4u}/passage/${translation.toUpperCase()}/${formattedBook}?start-chapter=${chapter}&start-verse=${verse}&end-verse=${verse}`;
      } else {
        // Whole chapter
        url = `${this.apis.bible4u}/passage/${translation.toUpperCase()}/${formattedBook}?start-chapter=${chapter}&start-verse=1&end-verse=999`;
      }
      
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.data && response.data.verses) {
        return {
          success: true,
          data: response.data.verses.map(v => ({
            book: formattedBook,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text,
            translation: translation.toUpperCase()
          })),
          source: 'bible4u'
        };
      }
      throw new Error('No verses found');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch Verse of the Day from HolyBible.dev
   */
  async fetchVerseOfTheDay() {
    try {
      const response = await axios.get(`${this.apis.holybible}/votd`, { timeout: 3000 });
      
      if (response.data) {
        return {
          success: true,
          data: {
            reference: response.data.reference || response.data.verse,
            text: response.data.text,
            translation: response.data.translation || 'KJV'
          },
          source: 'holybible'
        };
      }
      throw new Error('No VOTD found');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch from ESV API (requires API key)
   */
  async fetchFromESV(reference) {
    const apiKey = process.env.ESV_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'ESV API key not configured' };
    }

    try {
      const response = await axios.get(`${this.apis.esv}/passage/text/`, {
        params: {
          q: reference,
          'include-verse-numbers': true,
          'include-footnotes': false,
          'include-headings': false
        },
        headers: {
          'Authorization': `Token ${apiKey}`
        },
        timeout: 5000
      });
      
      if (response.data && response.data.passages) {
        return {
          success: true,
          data: {
            text: response.data.passages[0],
            reference: reference,
            translation: 'ESV'
          },
          source: 'esv'
        };
      }
      throw new Error('No passage found');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch from API.Bible (requires API key)
   * Supports modern translations: NIV, NLT, CSB, NASB
   */
  async fetchFromApiBible(bibleId, passageId) {
    const apiKey = process.env.API_BIBLE_KEY;
    if (!apiKey) {
      return { success: false, error: 'API.Bible key not configured' };
    }

    try {
      const response = await axios.get(`${this.apis.apiBible}/bibles/${bibleId}/passages/${passageId}`, {
        headers: {
          'api-key': apiKey
        },
        timeout: 5000
      });
      
      if (response.data && response.data.data) {
        return {
          success: true,
          data: {
            text: response.data.data.content,
            reference: response.data.data.reference,
            translation: response.data.data.bibleId
          },
          source: 'api-bible'
        };
      }
      throw new Error('No passage found');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Smart router - tries multiple APIs if primary fails
   */
  async getVerses(translation, book, chapter, verse = null) {
    const translationUpper = translation.toUpperCase();
    
    // Route to appropriate API based on translation
    if (['KJV', 'ASV', 'YLT', 'BBE'].includes(translationUpper)) {
      // Public domain translations - use bible4u
      return await this.fetchFromBible4u(translationUpper, book, chapter, verse);
    } 
    else if (translationUpper === 'ESV') {
      // ESV requires API key
      const reference = verse ? `${book} ${chapter}:${verse}` : `${book} ${chapter}`;
      return await this.fetchFromESV(reference);
    }
    else if (['NIV', 'NLT', 'CSB', 'NASB'].includes(translationUpper)) {
      // Modern translations - would need API.Bible with bibleId mapping
      // For now, return error with instructions
      return { 
        success: false, 
        error: `${translationUpper} requires API.Bible configuration. Please set API_BIBLE_KEY in .env` 
      };
    }
    else {
      return { success: false, error: `Translation ${translation} not supported` };
    }
  }
}

module.exports = new BibleApiService();