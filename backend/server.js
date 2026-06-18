// backend/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// CORS - Allow everything
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

console.log('🚀 Starting Logos Daily API Server...');

// ============ PAYMENT ROUTES ============
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Read users helper
function readUsers() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
  return { users: {} };
}

// Write users helper
function writeUsers(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize payment
// Initialize payment
app.post('/api/payments/initialize', async (req, res) => {
  try {
    const { email, amount, planId, userId } = req.body;
    const reference = 'LOGOS_' + Date.now() + '_' + Math.random().toString(36).substring(7);

    console.log('💰 Payment init:', { email, amount, planId, userId, reference });

    // Use real Paystack (no more mock mode)
    const https = require('https');
    const params = JSON.stringify({
      email: email,
      amount: Math.round(amount * 100), // Convert to kobo
      currency: 'NGN',
      reference: reference,
      callback_url: 'com.logosdaily.app://payment-success',
      metadata: { userId, plan: planId }
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET,
        'Content-Type': 'application/json'
      }
    };

    const payReq = https.request(options, (payRes) => {
      let data = '';
      payRes.on('data', chunk => data += chunk);
      payRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status) {
            // Return the REAL Paystack checkout URL
            res.json({
              success: true,
              paymentUrl: result.data.authorization_url,
              reference: reference
            });
          } else {
            res.status(400).json({ success: false, error: result.message });
          }
        } catch (e) {
          res.status(500).json({ success: false, error: 'Failed to parse Paystack response' });
        }
      });
    });
    
    payReq.on('error', (err) => {
      console.error('Paystack request error:', err);
      res.status(500).json({ success: false, error: 'Payment service unavailable. Please try again.' });
    });
    
    payReq.write(params);
    payReq.end();
    
  } catch (error) {
    console.error('Payment init error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Verify payment
// Verify payment
// Verify payment
app.get('/api/payments/verify/:reference', (req, res) => {
  const { reference } = req.params;
  console.log('🔍 Verifying payment:', reference);

  // If no Paystack key, DON'T auto-approve - require real payment
  if (!process.env.PAYSTACK_SECRET) {
    return res.json({ success: false, verified: false, message: 'Payment service not configured' });
  }

  const https = require('https');
  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/transaction/verify/' + encodeURIComponent(reference),
    method: 'GET',
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET }
  };
  
  https.get(options, (payRes) => {
    let body = '';
    payRes.on('data', chunk => body += chunk);
    payRes.on('end', () => {
      try {
        const result = JSON.parse(body);
        if (result.status && result.data.status === 'success') {
          const userId = result.data.metadata?.userId;
          if (userId) {
            const users = readUsers();
            users.users[userId] = { isPro: true, proSince: new Date().toISOString() };
            writeUsers(users);
          }
          res.json({ success: true, verified: true });
        } else {
          res.json({ success: false, verified: false });
        }
      } catch (e) {
        res.status(500).json({ success: false, error: 'Parse error' });
      }
    });
  }).on('error', () => res.status(500).json({ success: false, error: 'API error' }));
});

// Check Pro status
app.get('/api/payments/pro-status/:userId', (req, res) => {
  const { userId } = req.params;
  const data = readUsers();
  const isPro = data.users[userId]?.isPro === true;
  res.json({ success: true, isPro });
});

// Set Pro status (test endpoint)
//app.post('/api/payments/test-set-pro', (req, res) => {
  //const { userId } = req.body;
  //const data = readUsers();
  //data.users[userId] = { isPro: true, proSince: new Date().toISOString() };
  //writeUsers(data);
  //console.log('✅ Pro set for:', userId);
  //res.json({ success: true, isPro: true });
//});

// Webhook
// Webhook - Make sure this is working
app.post('/api/payments/webhook', (req, res) => {
  const event = req.body;
  console.log('📨 Webhook received:', JSON.stringify(event));

  if (event.event === 'charge.success') {
    const userId = event.data?.metadata?.userId;
    const reference = event.data?.reference;
    
    console.log('💰 Payment successful!');
    console.log('   User ID:', userId);
    console.log('   Reference:', reference);
    
    if (userId) {
      const data = readUsers();
      data.users[userId] = {
        isPro: true,
        proSince: new Date().toISOString(),
        lastPaymentRef: reference,
        plan: event.data?.metadata?.plan || 'monthly',
        amount: event.data?.amount,
        email: event.data?.customer?.email,
      };
      writeUsers(data);
      console.log('✅ Pro activated for:', userId);
    } else {
      console.error('❌ No userId in webhook metadata');
    }
  }
  
  res.sendStatus(200);
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
    { code: 'DARBY', name: 'Darby Translation', description: 'Literal translation by John Nelson Darby', publicDomain: true, requiresPro: false },

    // Pro translations (require subscription)
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

// ===== GET CHAPTER - WITH REAL BIBLE CONTENT ========
// backend/server.js - Complete working chapter endpoint

// ============ BUILT-IN BIBLE CONTENT (Fallback) ============



// Load the Bible data

// ============ GET CHAPTER ENDPOINT ============

// Match /api/bible/KJV/John/3 format (with translation)
app.get('/api/bible/:translation/:book/:chapter', async (req, res) => {
  try {
    const { translation, book, chapter } = req.params;
    const trans = translation.toLowerCase();
    const url = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${trans}`;
    
    console.log('📖 Fetching:', url);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    
    const data = await response.json();
    
    if (data.verses) {
      res.json({ 
        success: true, 
        data: data.verses.map(v => ({
          book: v.book_name || book,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text,
          translation: translation.toUpperCase()
        }))
      });
    } else {
      res.json({ success: false, error: 'No verses found' });
    }
  } catch (error) {
    console.error('Bible fetch error:', error.message);
    // Return fallback verses
    const { book, chapter, translation } = req.params;
    const verses = [];
    for (let i = 1; i <= 30; i++) {
      verses.push({
        book, chapter: parseInt(chapter), verse: i,
        text: `${book} ${chapter}:${i}`,
        translation: translation.toUpperCase()
      });
    }
    res.json({ success: true, data: verses, source: 'fallback' });
  }
}); 
  

  // 2. Try API for other books
  const translationMap = {
    'KJV': 'kjv',
    'ASV': 'asv',
    'WEB': 'web',
    'YLT': 'ylt',
    'BBE': 'bbe',
    'DARBY': 'darby',
    'NIV': 'niv',
    'NLT': 'nlt',
    'ESV': 'esv',
    'NASB': 'nasb',
    'CSB': 'csb',
    'NKJV': 'nkjv'
  };
  
  //const apiTranslation = translationMap[translationUpper] || 'kjv';
  
 // Get verse
app.get('/api/bible/:book/:chapter/:verse', async (req, res) => {
  try {
    const { book, chapter, verse } = req.params;
    const translation = req.query.translation || 'kjv';
    const url = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}:${verse}?translation=${translation}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    
    const data = await response.json();
    res.json({ success: true, data: [{ book, chapter: parseInt(chapter), verse: parseInt(verse), text: data.text, translation: translation.toUpperCase() }] });
  } catch (error) {
    res.json({ success: true, data: [{ book, chapter: parseInt(chapter), verse: parseInt(verse), text: `${book} ${chapter}:${verse}`, translation: translation.toUpperCase() }] });
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

// Bible API proxy
app.get('/api/bible/:book/:chapter', async (req, res) => {
  try {
    const { book, chapter } = req.params;
    const translation = req.query.translation || 'kjv';
    const url = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${translation}`;
    
    console.log('📖 Fetching Bible:', url);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Bible API returned ${response.status}`);
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Bible API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Bible content' });
  }
});

// Also proxy individual verses
app.get('/api/bible/:book/:chapter/:verse', async (req, res) => {
  try {
    const { book, chapter, verse } = req.params;
    const translation = req.query.translation || 'kjv';
    const url = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}:${verse}?translation=${translation}`;
    
    console.log('📖 Fetching verse:', url);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Bible API returned ${response.status}`);
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch verse' });
  }
});


// ============ SEARCH ============
// ============ SEARCH FULL BIBLE ============
// ============ SEARCH FULL BIBLE ============
// ============ SEARCH FULL BIBLE ============
// ============ SEARCH FULL BIBLE ============
app.get('/api/bible/search', async (req, res) => {
  const { q, translation = 'kjv' } = req.query;
  
  if (!q || q.toString().trim().length < 2) {
    return res.json({ success: false, results: [], count: 0 });
  }
  
  const searchTerm = q.toString().trim().toLowerCase();
  console.log('🔍 Searching for: "' + searchTerm + '"');
  
  // Books to search (all 66 books)
  const books = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
    '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
    'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
    'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
    'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
  ];
  
  const allResults = [];
  
  try {
    // Search first 5 chapters of each book (enough to find common words)
    for (const book of books) {
      try {
        const url = `https://bible-api.com/${encodeURIComponent(book)}+1?translation=${translation}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        
        if (response.ok) {
          const data = await response.json();
          if (data.verses) {
            // Filter verses containing the search term
            const matching = data.verses.filter((v) => 
              v.text.toLowerCase().includes(searchTerm)
            );
            
            matching.forEach((v) => {
              allResults.push({
                reference: `${v.book_name || book} ${v.chapter}:${v.verse}`,
                text: v.text.trim(),
                book: v.book_name || book,
                chapter: v.chapter,
                verse: v.verse,
                translation: translation.toUpperCase()
              });
            });
          }
        }
      } catch (e) {
        // Skip failed books, continue to next
      }
      
      // Limit to 50 results to avoid timeout
      if (allResults.length >= 50) break;
    }
    
    console.log(`✅ Found ${allResults.length} results for "${searchTerm}"`);
    res.json({ 
      success: true, 
      query: searchTerm, 
      results: allResults.slice(0, 50), 
      count: allResults.length 
    });
    
  } catch (error) {
    console.error('Search error:', error.message);
    res.json({ success: true, query: searchTerm, results: [], count: 0 });
  }
});
// ============ START SERVER ============
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
