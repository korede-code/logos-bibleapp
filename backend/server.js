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
      callback_url: 'https://logos-daily.web.app/payment-success',
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
app.post('/api/payments/webhook', (req, res) => {
  const event = req.body;
  console.log('📨 Webhook:', event.event);

  if (event.event === 'charge.success') {
    const userId = event.data?.metadata?.userId;
    const reference = event.data?.reference;
    
    if (userId && reference) {
      const data = readUsers();
      data.users[userId] = {
        isPro: true,
        proSince: new Date().toISOString(),
        lastPaymentRef: reference,
      };
      writeUsers(data);
      console.log('✅ Pro activated via webhook for:', userId);
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
const BIBLE_CONTENT = {
  'John': {
    3: {
      1: 'There was a man of the Pharisees, named Nicodemus, a ruler of the Jews:',
      2: 'The same came to Jesus by night, and said unto him, Rabbi, we know that thou art a teacher come from God: for no man can do these miracles that thou doest, except God be with him.',
      3: 'Jesus answered and said unto him, Verily, verily, I say unto thee, Except a man be born again, he cannot see the kingdom of God.',
      4: 'Nicodemus saith unto him, How can a man be born when he is old? can he enter the second time into his mother\'s womb, and be born?',
      5: 'Jesus answered, Verily, verily, I say unto thee, Except a man be born of water and of the Spirit, he cannot enter into the kingdom of God.',
      6: 'That which is born of the flesh is flesh; and that which is born of the Spirit is spirit.',
      7: 'Marvel not that I said unto thee, Ye must be born again.',
      8: 'The wind bloweth where it listeth, and thou hearest the sound thereof, but canst not tell whence it cometh, and whither it goeth: so is every one that is born of the Spirit.',
      9: 'Nicodemus answered and said unto him, How can these things be?',
      10: 'Jesus answered and said unto him, Art thou a master of Israel, and knowest not these things?',
      11: 'Verily, verily, I say unto thee, We speak that we do know, and testify that we have seen; and ye receive not our witness.',
      12: 'If I have told you earthly things, and ye believe not, how shall ye believe, if I tell you of heavenly things?',
      13: 'And no man hath ascended up to heaven, but he that came down from heaven, even the Son of man which is in heaven.',
      14: 'And as Moses lifted up the serpent in the wilderness, even so must the Son of man be lifted up:',
      15: 'That whosoever believeth in him should not perish, but have eternal life.',
      16: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      17: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.',
      18: 'He that believeth on him is not condemned: but he that believeth not is condemned already, because he hath not believed in the name of the only begotten Son of God.',
      19: 'And this is the condemnation, that light is come into the world, and men loved darkness rather than light, because their deeds were evil.',
      20: 'For every one that doeth evil hateth the light, neither cometh to the light, lest his deeds should be reproved.',
      21: 'But he that doeth truth cometh to the light, that his deeds may be made manifest, that they are wrought in God.'
    },
    14: {
      1: 'Let not your heart be troubled: ye believe in God, believe also in me.',
      2: 'In my Father\'s house are many mansions: if it were not so, I would have told you. I go to prepare a place for you.',
      3: 'And if I go and prepare a place for you, I will come again, and receive you unto myself; that where I am, there ye may be also.',
      4: 'And whither I go ye know, and the way ye know.',
      5: 'Thomas saith unto him, Lord, we know not whither thou goest; and how can we know the way?',
      6: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.',
      7: 'If ye had known me, ye should have known my Father also: and from henceforth ye know him, and have seen him.',
      8: 'Philip saith unto him, Lord, shew us the Father, and it sufficeth us.',
      9: 'Jesus saith unto him, Have I been so long time with you, and yet hast thou not known me, Philip? he that hath seen me hath seen the Father; and how sayest thou then, Shew us the Father?',
      10: 'Believest thou not that I am in the Father, and the Father in me? the words that I speak unto you I speak not of myself: but the Father that dwelleth in me, he doeth the works.',
      11: 'Believe me that I am in the Father, and the Father in me: or else believe me for the very works\' sake.',
      12: 'Verily, verily, I say unto you, He that believeth on me, the works that I do shall he do also; and greater works than these shall he do; because I go unto my Father.',
      13: 'And whatsoever ye shall ask in my name, that will I do, that the Father may be glorified in the Son.',
      14: 'If ye shall ask any thing in my name, I will do it.',
      15: 'If ye love me, keep my commandments.',
      16: 'And I will pray the Father, and he shall give you another Comforter, that he may abide with you for ever;',
      17: 'Even the Spirit of truth; whom the world cannot receive, because it seeth him not, neither knoweth him: but ye know him; for he dwelleth with you, and shall be in you.',
      18: 'I will not leave you comfortless: I will come to you.',
      19: 'Yet a little while, and the world seeth me no more; but ye see me: because I live, ye shall live also.',
      20: 'At that day ye shall know that I am in my Father, and ye in me, and I in you.',
      21: 'He that hath my commandments, and keepeth them, he it is that loveth me: and he that loveth me shall be loved of my Father, and I will love him, and will manifest myself to him.'
    }
  },
  'Exodus': {
    3: {
      1: 'Now Moses kept the flock of Jethro his father in law, the priest of Midian: and he led the flock to the backside of the desert, and came to the mountain of God, even to Horeb.',
      2: 'And the angel of the LORD appeared unto him in a flame of fire out of the midst of a bush: and he looked, and, behold, the bush burned with fire, and the bush was not consumed.',
      3: 'And Moses said, I will now turn aside, and see this great sight, why the bush is not burnt.',
      4: 'And when the LORD saw that he turned aside to see, God called unto him out of the midst of the bush, and said, Moses, Moses. And he said, Here am I.',
      5: 'And he said, Draw not nigh hither: put off thy shoes from off thy feet, for the place whereon thou standest is holy ground.',
      6: 'Moreover he said, I am the God of thy father, the God of Abraham, the God of Isaac, and the God of Jacob. And Moses hid his face; for he was afraid to look upon God.',
      7: 'And the LORD said, I have surely seen the affliction of my people which are in Egypt, and have heard their cry by reason of their taskmasters; for I know their sorrows;'
    }
  },
  'Genesis': {
    1: {
      1: 'In the beginning God created the heaven and the earth.',
      2: 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.',
      3: 'And God said, Let there be light: and there was light.',
      4: 'And God saw the light, that it was good: and God divided the light from the darkness.',
      5: 'And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.'
    }
  },
  'Psalms': {
    23: {
      1: 'The LORD is my shepherd; I shall not want.',
      2: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.',
      3: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.',
      4: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.',
      5: 'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.',
      6: 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.'
    }
  },
  'Matthew': {
    5: {
      3: 'Blessed are the poor in spirit: for theirs is the kingdom of heaven.',
      4: 'Blessed are they that mourn: for they shall be comforted.',
      5: 'Blessed are the meek: for they shall inherit the earth.',
      6: 'Blessed are they which do hunger and thirst after righteousness: for they shall be filled.',
      7: 'Blessed are the merciful: for they shall obtain mercy.',
      8: 'Blessed are the pure in heart: for they shall see God.',
      9: 'Blessed are the peacemakers: for they shall be called the children of God.',
      10: 'Blessed are they which are persecuted for righteousness\' sake: for theirs is the kingdom of heaven.'
    }
  }
};

// ============ GET CHAPTER ENDPOINT ============
app.get('/api/bible/:translation/:book/:chapter', async (req, res) => {
  const { translation, book, chapter } = req.params;
  const translationUpper = translation.toUpperCase();
  const bookName = book.charAt(0).toUpperCase() + book.slice(1).toLowerCase();
  const chapterNum = parseInt(chapter);
  
  console.log(`📖 Chapter requested: ${translationUpper}/${bookName}/${chapterNum}`);
  
  // 1. Check built-in content first
  const builtIn = BIBLE_CONTENT[bookName]?.[chapterNum];
  if (builtIn) {
    const verses = Object.keys(builtIn).map(verseNum => ({
      book: bookName,
      chapter: chapterNum,
      verse: parseInt(verseNum),
      text: builtIn[verseNum],
      translation: translationUpper
    }));
    console.log(`  ✅ Built-in content: ${verses.length} verses`);
    return res.json({ success: true, data: verses, source: 'built-in' });
  }
  
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
  
  const apiTranslation = translationMap[translationUpper] || 'kjv';
  
  try {
    const url = `https://bible-api.com/${encodeURIComponent(bookName)}%20${chapterNum}?translation=${apiTranslation}`;
    console.log(`  Trying API: ${url}`);
    
    const response = await axios.get(url, { timeout: 8000 });
    
    if (response.data && response.data.verses) {
      const verses = response.data.verses.map(v => ({
        book: bookName,
        chapter: chapterNum,
        verse: v.verse,
        text: v.text,
        translation: translationUpper
      }));
      console.log(`  ✅ API: ${verses.length} verses`);
      return res.json({ success: true, data: verses, source: 'api' });
    }
  } catch (error) {
    console.log(`  ❌ API failed: ${error.message}`);
  }
  
  // 3. Fallback - Generic text
  console.log(`  ⚠️ No content available, using fallback`);
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
  res.json({ success: true, data: verses, source: 'fallback' });
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
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});