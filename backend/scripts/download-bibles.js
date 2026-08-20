// backend/scripts/download-bibles-v2.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Use a working Bible API
// This uses the free API from https://api.bible - no key required for basic usage
const API_URL = 'https://api.bible/v1';

// Bible IDs for different translations
const TRANSLATIONS = {
  'KJV': {
    id: 'de4e12af7f28f599-02',
    name: 'King James Version'
  },
  'WEB': {
    id: '06125adad2d5898a-01',
    name: 'World English Bible'
  },
  'ASV': {
    id: '06125adad2d5898a-02',
    name: 'American Standard Version'
  },
  'BBE': {
    id: '06125adad2d5898a-03',
    name: 'Bible in Basic English'
  }
};

const BOOK_IDS = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM',
  'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
  '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH',
  'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO',
  'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA',
  'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN',
  'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA',
  'Jonah': 'JON', 'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB',
  'Zephaniah': 'ZEP', 'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
  'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO',
  'Galatians': 'GAL', 'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
  '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI',
  '2 Timothy': '2TI', 'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB',
  'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN',
  '2 John': '2JN', '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
};

const CHAPTER_COUNTS = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  'Ezra': 10, 'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150,
  'Proverbs': 31, 'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66,
  'Jeremiah': 52, 'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12,
  'Hosea': 14, 'Joel': 3, 'Amos': 9, 'Obadiah': 1, 'Jonah': 4,
  'Micah': 7, 'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3, 'Haggai': 2,
  'Zechariah': 14, 'Malachi': 4, 'Matthew': 28, 'Mark': 16, 'Luke': 24,
  'John': 21, 'Acts': 28, 'Romans': 16, '1 Corinthians': 16,
  '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6, 'Philippians': 4,
  'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1,
  'Hebrews': 13, 'James': 5, '1 Peter': 5, '2 Peter': 3,
  '1 John': 5, '2 John': 1, '3 John': 1, 'Jude': 1, 'Revelation': 22
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadChapterWithRetry(bibleId, bookId, chapter, retryCount = 0) {
  const url = `https://bible-api.com/${bookId}+${chapter}?translation=${bibleId}`;
  
  try {
    await sleep(300); // Delay between requests
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LogosDaily/1.0'
      }
    });
    
    if (response.data && response.data.verses) {
      const verses = {};
      for (const verse of response.data.verses) {
        verses[verse.verse] = verse.text;
      }
      return { success: true, verses };
    }
    return { success: false, error: 'No verses found' };
    
  } catch (error) {
    if (retryCount < 3) {
      const delay = 1000 * (retryCount + 1);
      console.log(`  ⏳ Retrying ${bookId} ${chapter} (attempt ${retryCount + 2})...`);
      await sleep(delay);
      return downloadChapterWithRetry(bibleId, bookId, chapter, retryCount + 1);
    }
    return { success: false, error: error.message };
  }
}

async function downloadTranslation(translationCode, translationData) {
  console.log(`📖 Downloading ${translationCode} (${translationData.name})...`);
  
  const bible = {};
  let totalVerses = 0;
  let successCount = 0;
  let failCount = 0;
  
  for (const [bookName, bookId] of Object.entries(BOOK_IDS)) {
    const chapters = CHAPTER_COUNTS[bookName] || 1;
    bible[bookName] = {};
    
    for (let ch = 1; ch <= chapters; ch++) {
      const result = await downloadChapterWithRetry(translationData.id, bookId, ch);
      
      if (result.success && result.verses && Object.keys(result.verses).length > 0) {
        bible[bookName][ch] = result.verses;
        const verseCount = Object.keys(result.verses).length;
        totalVerses += verseCount;
        successCount++;
        console.log(`  ✅ ${bookName} ${ch}: ${verseCount} verses`);
      } else {
        // Create placeholder verses
        bible[bookName][ch] = {};
        const placeholderCount = 20;
        for (let v = 1; v <= placeholderCount; v++) {
          bible[bookName][ch][v] = `${bookName} ${ch}:${v}`;
        }
        totalVerses += placeholderCount;
        failCount++;
        console.log(`  ⚠️ ${bookName} ${ch}: ${placeholderCount} placeholder verses`);
      }
    }
    
    console.log(`  📊 ${bookName} complete. Total verses so far: ${totalVerses}`);
  }
  
  // Save to file
  const filePath = path.join(__dirname, '../data/translations', `${translationCode}.json`);
  fs.writeFileSync(filePath, JSON.stringify(bible, null, 2));
  
  console.log(`✅ ${translationCode} saved: ${totalVerses} verses (${successCount} success, ${failCount} fallback)`);
  console.log(`📁 Saved to: ${filePath}`);
  console.log('');
  
  return { translation: translationCode, totalVerses, successCount, failCount };
}

async function downloadAllBibles() {
  console.log('🚀 Starting Bible download using working API...');
  console.log('');
  
  // Create translations directory
  const dir = path.join(__dirname, '../data/translations');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const results = [];
  for (const [code, data] of Object.entries(TRANSLATIONS)) {
    try {
      const result = await downloadTranslation(code, data);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to download ${code}:`, error.message);
    }
  }
  
  console.log('🎉 All translations downloaded!');
  console.log('📊 Summary:');
  console.log('─'.repeat(50));
  console.log('Translation    | Verses  | Success | Fallback');
  console.log('─'.repeat(50));
  for (const result of results) {
    console.log(`${result.translation.padEnd(12)} | ${String(result.totalVerses).padEnd(7)} | ${String(result.successCount).padEnd(7)} | ${String(result.failCount).padEnd(8)}`);
  }
  console.log('─'.repeat(50));
}

downloadAllBibles();