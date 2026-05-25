const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

console.log('🚀 Starting Logos Daily API Server...');

// ============ MOCK PAYMENT STORAGE ============
const proUsers = new Map();

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  console.log('✅ Health check called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ MOCK PAYMENT ROUTES (NO EXTERNAL DEPENDENCIES) ============
app.post('/api/payments/initialize', (req, res) => {
  console.log('💳 Mock payment initialize called');
  console.log('Request body:', req.body);
  
  const { email, amount, planId, userId } = req.body;
  
  // Generate a mock reference
  const mockReference = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    success: true,
    mock: true,
    authorization_url: '#',
    reference: mockReference,
    message: 'Mock payment - Pro status will be activated'
  });
});

app.get('/api/payments/verify/:reference', (req, res) => {
  const { reference } = req.params;
  console.log(`🔍 Mock payment verification: ${reference}`);
  
  res.json({
    success: true,
    verified: true,
    mock: true,
    data: {
      reference: reference,
      amount: 2990,
      planId: 'monthly',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  });
});

// ============ USER ROUTES ============
app.post('/api/users/set-pro-status', (req, res) => {
  console.log('📝 Setting pro status:', req.body);
  const { uid, isPro, planId, expiryDate } = req.body;
  
  if (uid) {
    proUsers.set(uid, {
      isPro: isPro || false,
      planId: planId,
      expiryDate: expiryDate,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ User ${uid} pro status set to ${isPro}`);
  }
  
  res.json({ success: true });
});

app.get('/api/users/check-pro/:uid', (req, res) => {
  const { uid } = req.params;
  const user = proUsers.get(uid);
  console.log(`🔍 Checking pro status for ${uid}: ${user?.isPro || false}`);
  
  res.json({ 
    success: true, 
    isPro: user?.isPro || false,
    planId: user?.planId,
    expiryDate: user?.expiryDate
  });
});

app.get('/api/users/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-routes' });
});

// ============ SUPPORTED TRANSLATIONS ============
app.get('/api/bible/translations', (req, res) => {
  console.log('📚 Translations endpoint called');
  
  const translations = [
    { code: 'KJV', name: 'King James Version', description: 'The classic 1611 English translation', publicDomain: true, requiresPro: false },
    { code: 'ASV', name: 'American Standard Version', description: 'Early 20th-century revision of the KJV', publicDomain: true, requiresPro: false },
    { code: 'WEB', name: 'World English Bible', description: 'Modern English public domain translation', publicDomain: true, requiresPro: false },
    { code: 'YLT', name: "Young's Literal Translation", description: 'Very literal word-for-word translation', publicDomain: true, requiresPro: false },
    { code: 'BBE', name: 'Bible in Basic English', description: 'Simple English using 1000 basic words', publicDomain: true, requiresPro: false },
    { code: 'NIV', name: 'New International Version', description: 'Most popular modern English translation', publicDomain: false, requiresPro: true },
    { code: 'NLT', name: 'New Living Translation', description: 'Easy-to-read modern translation', publicDomain: false, requiresPro: true },
    { code: 'ESV', name: 'English Standard Version', description: 'Essentially literal translation for study', publicDomain: false, requiresPro: true },
    { code: 'NASB', name: 'New American Standard Bible', description: 'Highly literal modern translation', publicDomain: false, requiresPro: true },
    { code: 'CSB', name: 'Christian Standard Bible', description: 'Optimal equivalence translation', publicDomain: false, requiresPro: true },
    { code: 'NKJV', name: 'New King James Version', description: 'Modern update of the KJV', publicDomain: false, requiresPro: true },
  ];
  
  res.json({ 
    success: true, 
    translations,
    count: translations.length,
    timestamp: new Date().toISOString()
  });
});

// ============ VERSE OF THE DAY ============
const POPULAR_VERSES = [
  { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', book: 'John', chapter: 3, verse: 16 },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.', book: 'Philippians', chapter: 4, verse: 13 },
  { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.', book: 'Jeremiah', chapter: 29, verse: 11 },
  { ref: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.', book: 'Romans', chapter: 8, verse: 28 },
  { ref: 'Psalm 23:4', text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.', book: 'Psalm', chapter: 23, verse: 4 },
  { ref: 'Matthew 11:28', text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', book: 'Matthew', chapter: 11, verse: 28 },
  { ref: 'Isaiah 40:31', text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', book: 'Isaiah', chapter: 40, verse: 31 },
  { ref: 'Proverbs 3:5-6', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.', book: 'Proverbs', chapter: 3, verse: 5 },
  { ref: 'Joshua 1:9', text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.', book: 'Joshua', chapter: 1, verse: 9 }
];

app.get('/api/bible/votd', (req, res) => {
  const isRandom = req.query.random === 'true';
  console.log('📖 VOTD endpoint called, random:', isRandom);
  
  let selectedVerse;
  if (isRandom) {
    const randomIndex = Math.floor(Math.random() * POPULAR_VERSES.length);
    selectedVerse = POPULAR_VERSES[randomIndex];
    console.log(`🎲 Random verse: ${selectedVerse.ref}`);
  } else {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const verseIndex = dayOfYear % POPULAR_VERSES.length;
    selectedVerse = POPULAR_VERSES[verseIndex];
    console.log(`📅 Daily verse: ${selectedVerse.ref}`);
  }
  
  res.json({
    success: true,
    data: {
      reference: selectedVerse.ref,
      text: selectedVerse.text,
      translation: 'KJV',
      book: selectedVerse.book,
      chapter: selectedVerse.chapter,
      verse: selectedVerse.verse
    },
    random: isRandom,
    timestamp: new Date().toISOString()
  });
});

// ============ GET CHAPTER ============
app.get('/api/bible/:translation/:book/:chapter', async (req, res) => {
  const { translation, book, chapter } = req.params;
  console.log(`📖 Chapter: ${translation}/${book}/${chapter}`);
  
  try {
    const url = `https://bible-api.com/${encodeURIComponent(book)}%20${chapter}?translation=${translation.toLowerCase()}`;
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.verses) {
      const verses = response.data.verses.map(v => ({
        book: book,
        chapter: parseInt(chapter),
        verse: v.verse,
        text: v.text,
        translation: translation.toUpperCase()
      }));
      res.json({ success: true, data: verses });
    } else {
      throw new Error('No verses');
    }
  } catch (error) {
    console.log('Using mock data for chapter');
    const mockVerses = [];
    for (let i = 1; i <= 30; i++) {
      mockVerses.push({
        book: book,
        chapter: parseInt(chapter),
        verse: i,
        text: `${book} ${chapter}:${i}`,
        translation: translation.toUpperCase()
      });
    }
    res.json({ success: true, data: mockVerses });
  }
});

// ============ GET SINGLE VERSE ============
app.get('/api/bible/:translation/:book/:chapter/:verse', async (req, res) => {
  const { translation, book, chapter, verse } = req.params;
  console.log(`📖 Verse: ${translation}/${book}/${chapter}:${verse}`);
  
  try {
    const url = `https://bible-api.com/${encodeURIComponent(book)}%20${chapter}:${verse}?translation=${translation.toLowerCase()}`;
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.text) {
      res.json({
        success: true,
        data: [{
          book: book,
          chapter: parseInt(chapter),
          verse: parseInt(verse),
          text: response.data.text,
          translation: translation.toUpperCase()
        }]
      });
    } else {
      throw new Error('Verse not found');
    }
  } catch (error) {
    res.json({
      success: true,
      data: [{
        book: book,
        chapter: parseInt(chapter),
        verse: parseInt(verse),
        text: `${book} ${chapter}:${verse}`,
        translation: translation.toUpperCase()
      }]
    });
  }
});

// ============ SEARCH ============
app.get('/api/bible/search', (req, res) => {
  const { q, translation = 'KJV' } = req.query;
  console.log(`🔍 Search: "${q}"`);
  
  if (!q || q.toString().trim().length < 2) {
    return res.json({ success: false, results: [], count: 0 });
  }
  
  const searchTerm = q.toString().trim().toLowerCase();
  const results = POPULAR_VERSES.filter(verse => 
    verse.text.toLowerCase().includes(searchTerm) ||
    verse.ref.toLowerCase().includes(searchTerm)
  ).map(verse => {
    const [book, chapterVerse] = verse.ref.split(' ');
    const [chapter, verseNum] = chapterVerse.split(':');
    return {
      reference: verse.ref,
      text: verse.text.substring(0, 200),
      book: book,
      chapter: parseInt(chapter),
      verse: parseInt(verseNum) || 1,
      translation: translation
    };
  });
  
  res.json({ 
    success: true, 
    query: searchTerm, 
    results, 
    count: results.length 
  });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     ✅ Logos Daily API Server Running (MOCK MODE)            ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                               ║
║  URL:  http://localhost:${PORT}                              ║
╠══════════════════════════════════════════════════════════════╣
║  📖 Test Endpoints:                                          ║
║  • GET  http://localhost:${PORT}/api/health                  ║
║  • GET  http://localhost:${PORT}/api/bible/votd              ║
║  • GET  http://localhost:${PORT}/api/bible/votd?random=true  ║
║  • GET  http://localhost:${PORT}/api/bible/translations      ║
║  • GET  http://localhost:${PORT}/api/users/health            ║
║  • POST http://localhost:${PORT}/api/payments/initialize     ║
╚══════════════════════════════════════════════════════════════╝
  `);
});