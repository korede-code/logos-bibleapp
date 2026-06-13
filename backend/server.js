const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');
const paymentRoutes = require('./routes/paymentRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api/payments', paymentRoutes);


app.use(cors({
  origin: '*',
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


//const axios = require('axios');

// Initialize Paystack payment
app.post('/api/payments/initialize', async (req, res) => {
  console.log('💰 Payment endpoint called');
  console.log('Request body:', req.body);
  
  const { email, amount, planId, userId } = req.body;
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  
  // Check if secret key exists
  if (!PAYSTACK_SECRET) {
    console.error('❌ PAYSTACK_SECRET_KEY not found in environment variables');
    return res.status(500).json({ 
      success: false, 
      error: 'Payment system not configured. Please add PAYSTACK_SECRET_KEY.' 
    });
  }
  
  console.log('✅ Paystack secret key found');
  
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amount),
        currency: 'NGN',
        metadata: {
          userId,
          planId,
        },
        callback_url: 'https://logos-daily.web.app/payment-callback',
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );
    
    console.log('✅ Paystack response:', response.data);
    
    res.json({
      success: true,
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
    });
  } catch (error) {
    console.error('❌ Paystack error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || 'Payment initialization failed' 
    });
  }
});

// Verify payment endpoint
app.get('/api/payments/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  console.log(`🔍 Verifying payment: ${reference}`);
  
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  
  if (!PAYSTACK_SECRET) {
    return res.status(500).json({ success: false, error: 'Paystack not configured' });
  }
  
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
        timeout: 10000
      }
    );
    
    const paymentData = response.data.data;
    
    if (paymentData.status === 'success') {
      console.log('✅ Payment verified successfully');
      
      // Get plan details
      const planId = paymentData.metadata?.planId || 'monthly';
      const plans = {
        monthly: { days: 30, name: 'Monthly Pro' },
        yearly: { days: 365, name: 'Yearly Pro' },
        lifetime: { days: 9999, name: 'Lifetime Access' }
      };
      const plan = plans[planId];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.days);
      
      res.json({
        success: true,
        verified: true,
        data: {
          reference: paymentData.reference,
          amount: paymentData.amount,
          userId: paymentData.metadata?.userId,
          planId: planId,
          planName: plan.name,
          expiryDate: expiryDate.toISOString(),
        }
      });
    } else {
      res.json({ success: false, verified: false, message: 'Payment not successful' });
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});



// Paystack webhook (for server-to-server notifications)
app.post('/api/payments/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  
  if (PAYSTACK_SECRET && PAYSTACK_SECRET !== 'sk_test_') {
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== signature) {
      return res.status(401).send('Unauthorized');
    }
  }
  
  const event = req.body;
  
  if (event.event === 'charge.success') {
    console.log('🎉 Webhook: Payment successful');
    // Update user's pro status in your database here
  }
  
  res.send(200);
});

function getPlanDetails(planId) {
  const plans = {
    monthly: { name: 'Monthly Pro', days: 30, amount: 2990 },
    yearly: { name: 'Yearly Pro', days: 365, amount: 29900 },
    lifetime: { name: 'Lifetime Access', days: 9999, amount: 99900 },
  };
  return plans[planId] || plans.monthly;
}

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
app.get('/api/bible/:translation/:book/:chapter', async (req, res) => {
  const { translation, book, chapter } = req.params;
  const translationUpper = translation.toUpperCase();
  const bookName = book.charAt(0).toUpperCase() + book.slice(1).toLowerCase();
  const chapterNum = parseInt(chapter);
  
  console.log(`📖 Chapter requested: ${translationUpper}/${bookName}/${chapterNum}`);
  
  // Map of translation codes to API parameters
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
  
  const apiTranslation = translationMap[translationUpper] || 'kjv';
  
  try {
    // Try to fetch from free Bible API (supports many translations)
    const url = `https://bible-api.com/${encodeURIComponent(bookName)}%20${chapterNum}?translation=${apiTranslation}`;
    console.log(`  Fetching: ${url}`);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.verses) {
      const verses = response.data.verses.map(v => ({
        book: bookName,
        chapter: chapterNum,
        verse: v.verse,
        text: v.text,
        translation: translationUpper
      }));
      console.log(`  ✅ Found ${verses.length} verses for ${translationUpper}`);
      return res.json({ success: true, data: verses });
    }
    throw new Error('No verses returned');
  } catch (error) {
    console.log(`  ❌ API error for ${translationUpper}: ${error.message}`);
    
    // For Pro translations, show upgrade message
    const isProTranslation = ['NIV', 'NLT', 'ESV', 'NASB', 'CSB', 'NKJV'].includes(translationUpper);
    
    if (isProTranslation) {
      const verses = [];
      for (let i = 1; i <= 30; i++) {
        verses.push({
          book: bookName,
          chapter: chapterNum,
          verse: i,
          text: `[${translationUpper}] This translation requires a Pro subscription. Upgrade to access ${translationUpper} content.`,
          translation: translationUpper
        });
      }
      return res.json({ success: true, data: verses, requiresPro: true });
    }
    
    // Fallback to KJV for free translations
    try {
      const fallbackUrl = `https://bible-api.com/${encodeURIComponent(bookName)}%20${chapterNum}?translation=kjv`;
      const fallbackResponse = await axios.get(fallbackUrl, { timeout: 10000 });
      
      if (fallbackResponse.data && fallbackResponse.data.verses) {
        const verses = fallbackResponse.data.verses.map(v => ({
          book: bookName,
          chapter: chapterNum,
          verse: v.verse,
          text: v.text,
          translation: 'KJV (Fallback)'
        }));
        return res.json({ success: true, data: verses, fallback: true });
      }
    } catch (fallbackError) {
      console.log('Fallback also failed');
    }
    
    // Ultimate fallback
    const verses = [];
    for (let i = 1; i <= 30; i++) {
      verses.push({
        book: bookName,
        chapter: chapterNum,
        verse: i,
        text: `${bookName} ${chapterNum}:${i}`,
        translation: translationUpper
      });
    }
    res.json({ success: true, data: verses });
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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
  console.log(`💳 Payments: http://localhost:${PORT}/api/payments/initialize`);
});