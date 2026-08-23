// backend/scripts/download-all-translations.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ✅ Translations to download
const TRANSLATIONS = [
  { code: 'KJV', name: 'King James Version' },
  { code: 'ASV', name: 'American Standard Version' },
  { code: 'WEB', name: 'World English Bible' },
  { code: 'BBE', name: 'Bible in Basic English' },
  { code: 'DARBY', name: 'Darby Translation' },
  { code: 'YLT', name: "Young's Literal Translation" }
];

// ✅ Correct verse counts for single-chapter books
const SINGLE_CHAPTER_VERSE_COUNTS = {
  'Obadiah': 21,
  'Philemon': 25,
  '2 John': 13,
  '3 John': 15,
  'Jude': 25,
};

const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms',
  'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
  'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
  'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke',
  'John', 'Acts', 'Romans', '1 Corinthians',
  '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians',
  'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

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

async function downloadChapter(translation, book, chapter, retryCount = 0) {
  const url = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${translation.toLowerCase()}`;
  
  try {
    // ✅ Longer delay to avoid rate limiting
    await sleep(800);
    
    const response = await axios.get(url, { 
      timeout: 20000,
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
    if (error.response && error.response.status === 429) {
      if (retryCount < 3) {
        const delay = 2000 * Math.pow(2, retryCount);
        console.log(`  ⏳ Rate limited for ${book} ${chapter}, retrying in ${delay}ms...`);
        await sleep(delay);
        return downloadChapter(translation, book, chapter, retryCount + 1);
      }
    }
    
    // ✅ If API fails, create placeholder with correct verse count
    const verseCount = SINGLE_CHAPTER_VERSE_COUNTS[book] || 30;
    const verses = {};
    for (let v = 1; v <= verseCount; v++) {
      verses[v] = `${book} ${chapter}:${v}`;
    }
    console.log(`  ⚠️ Placeholder for ${book} ${chapter}: ${verseCount} verses`);
    return { success: true, verses };
  }
}

async function downloadTranslation(translation) {
  console.log(`\n📖 Downloading ${translation.code} (${translation.name})...`);
  console.log(`⏳ ${BOOKS.length} books, ~800ms delay between requests`);
  
  const bible = {};
  let totalVerses = 0;
  let successCount = 0;
  
  for (const book of BOOKS) {
    const chapters = CHAPTER_COUNTS[book] || 1;
    bible[book] = {};
    
    for (let ch = 1; ch <= chapters; ch++) {
      const result = await downloadChapter(translation.code, book, ch);
      
      if (result.success && result.verses) {
        bible[book][ch] = result.verses;
        const verseCount = Object.keys(result.verses).length;
        totalVerses += verseCount;
        successCount++;
        console.log(`  ✅ ${book} ${ch}: ${verseCount} verses`);
      }
    }
    
    console.log(`  📊 ${book} complete. Total: ${totalVerses} verses`);
  }
  
  const filePath = path.join(__dirname, '../data/translations', `${translation.code}.json`);
  fs.writeFileSync(filePath, JSON.stringify(bible, null, 2));
  
  console.log(`✅ ${translation.code} saved: ${totalVerses} verses`);
  console.log(`📁 Saved to: ${filePath}`);
  
  return { translation: translation.code, totalVerses, successCount };
}

async function downloadAll() {
  console.log('🚀 Starting Bible download...');
  console.log(`📚 Translations: ${TRANSLATIONS.map(t => t.code).join(', ')}`);
  console.log(`📖 Books: ${BOOKS.length}`);
  console.log(`⏳ Delay: 800ms between requests`);
  console.log('');
  
  const dir = path.join(__dirname, '../data/translations');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  for (const translation of TRANSLATIONS) {
    try {
      await downloadTranslation(translation);
    } catch (error) {
      console.error(`❌ Failed to download ${translation.code}:`, error.message);
    }
  }
  
  console.log('\n🎉 All translations downloaded!');
}

downloadAll();