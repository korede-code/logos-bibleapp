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
    const { email, amount, planId, userId, isMobile } = req.body;
    const reference = 'LOGOS_' + Date.now() + '_' + Math.random().toString(36).substring(7);

    console.log('💰 Payment init:', { email, amount, planId, userId, reference });

    // Use real Paystack (no more mock mode)
    const https = require('https');
    // Use different callback for mobile vs web
    const callbackUrl = isMobile 
      ? 'com.logosdaily.app://payment-success'
      : 'https://logos-daily.web.app/payment-success';
      
    const params = JSON.stringify({
      email: email,
      amount: Math.round(amount * 100), // Convert to kobo
      currency: 'NGN',
      reference: reference,
      callback_url: callbackUrl,
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
app.post('/api/payments/test-set-pro', (req, res) => {
  const { userId } = req.body;
  const data = readUsers();
  data.users[userId] = { isPro: true, proSince: new Date().toISOString() };
  writeUsers(data);
  console.log('✅ Pro set for:', userId);
  res.json({ success: true, isPro: true });
});

// Webhook - IMPORTANT: Parse raw body for Paystack
app.post('/api/payments/webhook', express.json(), (req, res) => {
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
  // PENTATEUCH (Genesis - Deuteronomy)
  { ref: "Genesis 1:1", text: "In the beginning God created the heaven and the earth." },
  { ref: "Genesis 1:27", text: "So God created man in his own image, in the image of God created he him; male and female created he them." },
  { ref: "Genesis 28:15", text: "And, behold, I am with thee, and will keep thee in all places whither thou goest, and will bring thee again into this land; for I will not leave thee, until I have done that which I have spoken to thee of." },
  { ref: "Exodus 3:14", text: "And God said unto Moses, I AM THAT I AM: and he said, Thus shalt thou say unto the children of Israel, I AM hath sent me unto you." },
  { ref: "Exodus 14:14", text: "The LORD shall fight for you, and ye shall hold your peace." },
  { ref: "Exodus 20:3", text: "Thou shalt have no other gods before me." },
  { ref: "Exodus 20:12", text: "Honour thy father and thy mother: that thy days may be long upon the land which the LORD thy God giveth thee." },
  { ref: "Leviticus 19:18", text: "Thou shalt not avenge, nor bear any grudge against the children of thy people, but thou shalt love thy neighbour as thyself: I am the LORD." },
  { ref: "Numbers 6:24", text: "The LORD bless thee, and keep thee:" },
  { ref: "Numbers 6:25", text: "The LORD make his face shine upon thee, and be gracious unto thee:" },
  { ref: "Numbers 6:26", text: "The LORD lift up his countenance upon thee, and give thee peace." },
  { ref: "Deuteronomy 6:5", text: "And thou shalt love the LORD thy God with all thine heart, and with all thy soul, and with all thy might." },
  { ref: "Deuteronomy 31:6", text: "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee." },
  { ref: "Deuteronomy 31:8", text: "And the LORD, he it is that doth go before thee; he will be with thee, he will not fail thee, neither forsake thee: fear not, neither be dismayed." },

  // HISTORICAL BOOKS (Joshua - Esther)
  { ref: "Joshua 1:9", text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest." },
  { ref: "Joshua 24:15", text: "And if it seem evil unto you to serve the LORD, choose you this day whom ye will serve; but as for me and my house, we will serve the LORD." },
  { ref: "Ruth 1:16", text: "And Ruth said, Intreat me not to leave thee, or to return from following after thee: for whither thou goest, I will go; and where thou lodgest, I will lodge: thy people shall be my people, and thy God my God:" },
  { ref: "1 Samuel 16:7", text: "But the LORD said unto Samuel, Look not on his countenance, or on the height of his stature; because I have refused him: for the LORD seeth not as man seeth; for man looketh on the outward appearance, but the LORD looketh on the heart." },
  { ref: "2 Chronicles 7:14", text: "If my people, which are called by my name, shall humble themselves, and pray, and seek my face, and turn from their wicked ways; then will I hear from heaven, and will forgive their sin, and will heal their land." },

  // WISDOM LITERATURE (Job - Song of Solomon)
  { ref: "Job 1:21", text: "And said, Naked came I out of my mother's womb, and naked shall I return thither: the LORD gave, and the LORD hath taken away; blessed be the name of the LORD." },
  { ref: "Job 19:25", text: "For I know that my redeemer liveth, and that he shall stand at the latter day upon the earth:" },
  { ref: "Job 42:2", text: "I know that thou canst do every thing, and that no thought can be withholden from thee." },

  // PSALMS
  { ref: "Psalms 1:1", text: "Blessed is the man that walketh not in the counsel of the ungodly, nor standeth in the way of sinners, nor sitteth in the seat of the scornful." },
  { ref: "Psalms 1:2", text: "But his delight is in the law of the LORD; and in his law doth he meditate day and night." },
  { ref: "Psalms 3:3", text: "But thou, O LORD, art a shield for me; my glory, and the lifter up of mine head." },
  { ref: "Psalms 4:8", text: "I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety." },
  { ref: "Psalms 5:3", text: "My voice shalt thou hear in the morning, O LORD; in the morning will I direct my prayer unto thee, and will look up." },
  { ref: "Psalms 16:8", text: "I have set the LORD always before me: because he is at my right hand, I shall not be moved." },
  { ref: "Psalms 18:2", text: "The LORD is my rock, and my fortress, and my deliverer; my God, my strength, in whom I will trust; my buckler, and the horn of my salvation, and my high tower." },
  { ref: "Psalms 19:1", text: "The heavens declare the glory of God; and the firmament sheweth his handywork." },
  { ref: "Psalms 19:14", text: "Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD, my strength, and my redeemer." },
  { ref: "Psalms 20:7", text: "Some trust in chariots, and some in horses: but we will remember the name of the LORD our God." },
  { ref: "Psalms 22:1", text: "My God, my God, why hast thou forsaken me? why art thou so far from helping me, and from the words of my roaring?" },
  { ref: "Psalms 23:1", text: "The LORD is my shepherd; I shall not want." },
  { ref: "Psalms 23:4", text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me." },
  { ref: "Psalms 23:6", text: "Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever." },
  { ref: "Psalms 24:1", text: "The earth is the LORD's, and the fulness thereof; the world, and they that dwell therein." },
  { ref: "Psalms 25:4", text: "Shew me thy ways, O LORD; teach me thy paths." },
  { ref: "Psalms 27:1", text: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?" },
  { ref: "Psalms 27:4", text: "One thing have I desired of the LORD, that will I seek after; that I may dwell in the house of the LORD all the days of my life, to behold the beauty of the LORD, and to enquire in his temple." },
  { ref: "Psalms 27:14", text: "Wait on the LORD: be of good courage, and he shall strengthen thine heart: wait, I say, on the LORD." },
  { ref: "Psalms 28:7", text: "The LORD is my strength and my shield; my heart trusted in him, and I am helped: therefore my heart greatly rejoiceth; and with my song will I praise him." },
  { ref: "Psalms 29:2", text: "Give unto the LORD the glory due unto his name; worship the LORD in the beauty of holiness." },
  { ref: "Psalms 30:5", text: "For his anger endureth but a moment; in his favour is life: weeping may endure for a night, but joy cometh in the morning." },
  { ref: "Psalms 32:8", text: "I will instruct thee and teach thee in the way which thou shalt go: I will guide thee with mine eye." },
  { ref: "Psalms 33:20", text: "Our soul waiteth for the LORD: he is our help and our shield." },
  { ref: "Psalms 34:8", text: "O taste and see that the LORD is good: blessed is the man that trusteth in him." },
  { ref: "Psalms 34:18", text: "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit." },
  { ref: "Psalms 37:4", text: "Delight thyself also in the LORD; and he shall give thee the desires of thine heart." },
  { ref: "Psalms 37:5", text: "Commit thy way unto the LORD; trust also in him; and he shall bring it to pass." },
  { ref: "Psalms 40:1", text: "I waited patiently for the LORD; and he inclined unto me, and heard my cry." },
  { ref: "Psalms 42:1", text: "As the hart panteth after the water brooks, so panteth my soul after thee, O God." },
  { ref: "Psalms 46:1", text: "God is our refuge and strength, a very present help in trouble." },
  { ref: "Psalms 46:10", text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth." },
  { ref: "Psalms 50:15", text: "And call upon me in the day of trouble: I will deliver thee, and thou shalt glorify me." },
  { ref: "Psalms 51:10", text: "Create in me a clean heart, O God; and renew a right spirit within me." },
  { ref: "Psalms 55:22", text: "Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved." },
  { ref: "Psalms 56:3", text: "What time I am afraid, I will trust in thee." },
  { ref: "Psalms 62:8", text: "Trust in him at all times; ye people, pour out your heart before him: God is a refuge for us." },
  { ref: "Psalms 63:1", text: "O God, thou art my God; early will I seek thee: my soul thirsteth for thee, my flesh longeth for thee in a dry and thirsty land, where no water is;" },
  { ref: "Psalms 84:10", text: "For a day in thy courts is better than a thousand. I had rather be a doorkeeper in the house of my God, than to dwell in the tents of wickedness." },
  { ref: "Psalms 90:1", text: "Lord, thou hast been our dwelling place in all generations." },
  { ref: "Psalms 90:12", text: "So teach us to number our days, that we may apply our hearts unto wisdom." },
  { ref: "Psalms 91:1", text: "He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty." },
  { ref: "Psalms 91:2", text: "I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust." },
  { ref: "Psalms 95:6", text: "O come, let us worship and bow down: let us kneel before the LORD our maker." },
  { ref: "Psalms 100:1", text: "Make a joyful noise unto the LORD, all ye lands." },
  { ref: "Psalms 100:2", text: "Serve the LORD with gladness: come before his presence with singing." },
  { ref: "Psalms 100:3", text: "Know ye that the LORD he is God: it is he that hath made us, and not we ourselves; we are his people, and the sheep of his pasture." },
  { ref: "Psalms 103:1", text: "Bless the LORD, O my soul: and all that is within me, bless his holy name." },
  { ref: "Psalms 103:2", text: "Bless the LORD, O my soul, and forget not all his benefits:" },
  { ref: "Psalms 103:12", text: "As far as the east is from the west, so far hath he removed our transgressions from us." },
  { ref: "Psalms 107:1", text: "O give thanks unto the LORD, for he is good: for his mercy endureth for ever." },
  { ref: "Psalms 118:24", text: "This is the day which the LORD hath made; we will rejoice and be glad in it." },
  { ref: "Psalms 119:11", text: "Thy word have I hid in mine heart, that I might not sin against thee." },
  { ref: "Psalms 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path." },
  { ref: "Psalms 121:1", text: "I will lift up mine eyes unto the hills, from whence cometh my help." },
  { ref: "Psalms 121:2", text: "My help cometh from the LORD, which made heaven and earth." },
  { ref: "Psalms 136:1", text: "O give thanks unto the LORD; for he is good: for his mercy endureth for ever." },
  { ref: "Psalms 136:26", text: "O give thanks unto the God of heaven: for his mercy endureth for ever." },
  { ref: "Psalms 139:14", text: "I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well." },
  { ref: "Psalms 139:23", text: "Search me, O God, and know my heart: try me, and know my thoughts:" },
  { ref: "Psalms 139:24", text: "And see if there be any wicked way in me, and lead me in the way everlasting." },
  { ref: "Psalms 143:10", text: "Teach me to do thy will; for thou art my God: thy spirit is good; lead me into the land of uprightness." },
  { ref: "Psalms 145:3", text: "Great is the LORD, and greatly to be praised; and his greatness is unsearchable." },
  { ref: "Psalms 150:6", text: "Let every thing that hath breath praise the LORD. Praise ye the LORD." },

  // PROVERBS
  { ref: "Proverbs 1:7", text: "The fear of the LORD is the beginning of knowledge: but fools despise wisdom and instruction." },
  { ref: "Proverbs 3:5", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." },
  { ref: "Proverbs 3:6", text: "In all thy ways acknowledge him, and he shall direct thy paths." },
  { ref: "Proverbs 4:23", text: "Keep thy heart with all diligence; for out of it are the issues of life." },
  { ref: "Proverbs 9:10", text: "The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding." },
  { ref: "Proverbs 10:12", text: "Hatred stirreth up strifes: but love covereth all sins." },
  { ref: "Proverbs 11:25", text: "The liberal soul shall be made fat: and he that watereth shall be watered also himself." },
  { ref: "Proverbs 15:1", text: "A soft answer turneth away wrath: but grievous words stir up anger." },
  { ref: "Proverbs 16:3", text: "Commit thy works unto the LORD, and thy thoughts shall be established." },
  { ref: "Proverbs 16:9", text: "A man's heart deviseth his way: but the LORD directeth his steps." },
  { ref: "Proverbs 18:10", text: "The name of the LORD is a strong tower: the righteous runneth into it, and is safe." },
  { ref: "Proverbs 18:24", text: "A man that hath friends must shew himself friendly: and there is a friend that sticketh closer than a brother." },
  { ref: "Proverbs 22:6", text: "Train up a child in the way he should go: and when he is old, he will not depart from it." },
  { ref: "Proverbs 27:17", text: "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." },
  { ref: "Proverbs 30:5", text: "Every word of God is pure: he is a shield unto them that put their trust in him." },

  // ECCLESIASTES & SONG OF SOLOMON
  { ref: "Ecclesiastes 3:1", text: "To every thing there is a season, and a time to every purpose under the heaven:" },
  { ref: "Ecclesiastes 3:11", text: "He hath made every thing beautiful in his time: also he hath set the world in their heart, so that no man can find out the work that God maketh from the beginning to the end." },
  { ref: "Ecclesiastes 12:13", text: "Let us hear the conclusion of the whole matter: Fear God, and keep his commandments: for this is the whole duty of man." },
  { ref: "Song of Solomon 2:16", text: "My beloved is mine, and I am his: he feedeth among the lilies." },

  // MAJOR PROPHETS (Isaiah - Daniel)
  { ref: "Isaiah 6:8", text: "Also I heard the voice of the Lord, saying, Whom shall I send, and who will go for us? Then said I, Here am I; send me." },
  { ref: "Isaiah 9:6", text: "For unto us a child is born, unto us a son is given: and the government shall be upon his shoulder: and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace." },
  { ref: "Isaiah 26:3", text: "Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee." },
  { ref: "Isaiah 40:8", text: "The grass withereth, the flower fadeth: but the word of our God shall stand for ever." },
  { ref: "Isaiah 40:31", text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
  { ref: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness." },
  { ref: "Isaiah 43:2", text: "When thou passest through the waters, I will be with thee; and through the rivers, they shall not overflow thee: when thou walkest through the fire, thou shalt not be burned; neither shall the flame kindle upon thee." },
  { ref: "Isaiah 43:19", text: "Behold, I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert." },
  { ref: "Isaiah 49:16", text: "Behold, I have graven thee upon the palms of my hands; thy walls are continually before me." },
  { ref: "Isaiah 53:5", text: "But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed." },
  { ref: "Isaiah 55:8", text: "For my thoughts are not your thoughts, neither are your ways my ways, saith the LORD." },
  { ref: "Isaiah 55:9", text: "For as the heavens are higher than the earth, so are my ways higher than your ways, and my thoughts than your thoughts." },
  { ref: "Jeremiah 1:5", text: "Before I formed thee in the belly I knew thee; and before thou camest forth out of the womb I sanctified thee, and I ordained thee a prophet unto the nations." },
  { ref: "Jeremiah 17:7", text: "Blessed is the man that trusteth in the LORD, and whose hope the LORD is." },
  { ref: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end." },
  { ref: "Jeremiah 29:12", text: "Then shall ye call upon me, and ye shall go and pray unto me, and I will hearken unto you." },
  { ref: "Jeremiah 29:13", text: "And ye shall seek me, and find me, when ye shall search for me with all your heart." },
  { ref: "Jeremiah 33:3", text: "Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not." },
  { ref: "Lamentations 3:22", text: "It is of the LORD's mercies that we are not consumed, because his compassions fail not." },
  { ref: "Lamentations 3:23", text: "They are new every morning: great is thy faithfulness." },
  { ref: "Ezekiel 36:26", text: "A new heart also will I give you, and a new spirit will I put within you: and I will take away the stony heart out of your flesh, and I will give you an heart of flesh." },
  { ref: "Daniel 3:17", text: "If it be so, our God whom we serve is able to deliver us from the burning fiery furnace, and he will deliver us out of thine hand, O king." },
  { ref: "Daniel 3:18", text: "But if not, be it known unto thee, O king, that we will not serve thy gods, nor worship the golden image which thou hast set up." },

  // MINOR PROPHETS
  { ref: "Hosea 6:6", text: "For I desired mercy, and not sacrifice; and the knowledge of God more than burnt offerings." },
  { ref: "Hosea 10:12", text: "Sow to yourselves in righteousness, reap in mercy; break up your fallow ground: for it is time to seek the LORD, till he come and rain righteousness upon you." },
  { ref: "Joel 2:28", text: "And it shall come to pass afterward, that I will pour out my spirit upon all flesh; and your sons and your daughters shall prophesy, your old men shall dream dreams, your young men shall see visions:" },
  { ref: "Amos 5:14", text: "Seek good, and not evil, that ye may live: and so the LORD, the God of hosts, shall be with you, as ye have spoken." },
  { ref: "Micah 6:8", text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?" },
  { ref: "Habakkuk 2:4", text: "Behold, his soul which is lifted up is not upright in him: but the just shall live by his faith." },
  { ref: "Habakkuk 3:18", text: "Yet I will rejoice in the LORD, I will joy in the God of my salvation." },
  { ref: "Zephaniah 3:17", text: "The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy; he will rest in his love, he will joy over thee with singing." },
  { ref: "Zechariah 4:6", text: "Not by might, nor by power, but by my spirit, saith the LORD of hosts." },
  { ref: "Zechariah 9:9", text: "Rejoice greatly, O daughter of Zion; shout, O daughter of Jerusalem: behold, thy King cometh unto thee: he is just, and having salvation; lowly, and riding upon an ass, and upon a colt the foal of an ass." },
  { ref: "Malachi 3:10", text: "Bring ye all the tithes into the storehouse, that there may be meat in mine house, and prove me now herewith, saith the LORD of hosts, if I will not open you the windows of heaven, and pour you out a blessing, that there shall not be room enough to receive it." },

  // GOSPELS (Matthew - John)
  { ref: "Matthew 4:4", text: "But he answered and said, It is written, Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God." },
  { ref: "Matthew 5:14", text: "Ye are the light of the world. A city that is set on an hill cannot be hid." },
  { ref: "Matthew 5:16", text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." },
  { ref: "Matthew 5:44", text: "But I say unto you, Love your enemies, bless them that curse you, do good to them that hate you, and pray for them which despitefully use you, and persecute you;" },
  { ref: "Matthew 6:9", text: "After this manner therefore pray ye: Our Father which art in heaven, Hallowed be thy name." },
  { ref: "Matthew 6:33", text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
  { ref: "Matthew 6:34", text: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof." },
  { ref: "Matthew 7:7", text: "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you:" },
  { ref: "Matthew 7:8", text: "For every one that asketh receiveth; and he that seeketh findeth; and to him that knocketh it shall be opened." },
  { ref: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { ref: "Matthew 11:29", text: "Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls." },
  { ref: "Matthew 19:26", text: "But Jesus beheld them, and said unto them, With men this is impossible; but with God all things are possible." },
  { ref: "Matthew 22:37", text: "Jesus said unto him, Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind." },
  { ref: "Matthew 22:39", text: "And the second is like unto it, Thou shalt love thy neighbour as thyself." },
  { ref: "Matthew 28:19", text: "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost:" },
  { ref: "Matthew 28:20", text: "Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen." },
  { ref: "Mark 8:36", text: "For what shall it profit a man, if he shall gain the whole world, and lose his own soul?" },
  { ref: "Mark 10:27", text: "And Jesus looking upon them saith, With men it is impossible, but not with God: for with God all things are possible." },
  { ref: "Mark 12:30", text: "And thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind, and with all thy strength: this is the first commandment." },
  { ref: "Mark 16:15", text: "And he said unto them, Go ye into all the world, and preach the gospel to every creature." },
  { ref: "Luke 1:37", text: "For with God nothing shall be impossible." },
  { ref: "Luke 6:31", text: "And as ye would that men should do to you, do ye also to them likewise." },
  { ref: "Luke 10:27", text: "And he answering said, Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy strength, and with all thy mind; and thy neighbour as thyself." },
  { ref: "Luke 15:10", text: "Likewise, I say unto you, there is joy in the presence of the angels of God over one sinner that repenteth." },
  { ref: "Luke 18:27", text: "And he said, The things which are impossible with men are possible with God." },
  { ref: "Luke 19:10", text: "For the Son of man is come to seek and to save that which was lost." },
  { ref: "John 1:1", text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
  { ref: "John 1:14", text: "And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth." },
  { ref: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { ref: "John 3:17", text: "For God sent not his Son into the world to condemn the world; but that the world through him might be saved." },
  { ref: "John 5:24", text: "Verily, verily, I say unto you, He that heareth my word, and believeth on him that sent me, hath everlasting life, and shall not come into condemnation; but is passed from death unto life." },
  { ref: "John 8:12", text: "Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life." },
  { ref: "John 8:31", text: "Then said Jesus to those Jews which believed on him, If ye continue in my word, then are ye my disciples indeed;" },
  { ref: "John 8:32", text: "And ye shall know the truth, and the truth shall make you free." },
  { ref: "John 10:10", text: "The thief cometh not, but for to steal, and to kill, and to destroy: I am come that they might have life, and that they might have it more abundantly." },
  { ref: "John 10:11", text: "I am the good shepherd: the good shepherd giveth his life for the sheep." },
  { ref: "John 11:25", text: "Jesus said unto her, I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live:" },
  { ref: "John 13:34", text: "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another." },
  { ref: "John 13:35", text: "By this shall all men know that ye are my disciples, if ye have love one to another." },
  { ref: "John 14:1", text: "Let not your heart be troubled: ye believe in God, believe also in me." },
  { ref: "John 14:2", text: "In my Father's house are many mansions: if it were not so, I would have told you. I go to prepare a place for you." },
  { ref: "John 14:3", text: "And if I go and prepare a place for you, I will come again, and receive you unto myself; that where I am, there ye may be also." },
  { ref: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
  { ref: "John 14:15", text: "If ye love me, keep my commandments." },
  { ref: "John 14:16", text: "And I will pray the Father, and he shall give you another Comforter, that he may abide with you for ever;" },
  { ref: "John 14:27", text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid." },
  { ref: "John 15:5", text: "I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing." },
  { ref: "John 15:12", text: "This is my commandment, That ye love one another, as I have loved you." },
  { ref: "John 15:13", text: "Greater love hath no man than this, that a man lay down his life for his friends." },
  { ref: "John 16:33", text: "These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world." },
  { ref: "John 17:3", text: "And this is life eternal, that they might know thee the only true God, and Jesus Christ, whom thou hast sent." },
  { ref: "John 20:29", text: "Jesus saith unto him, Thomas, because thou hast seen me, thou hast believed: blessed are they that have not seen, and yet have believed." },

  // ACTS
  { ref: "Acts 1:8", text: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth." },
  { ref: "Acts 4:12", text: "Neither is there salvation in any other: for there is none other name under heaven given among men, whereby we must be saved." },
  { ref: "Acts 16:31", text: "And they said, Believe on the Lord Jesus Christ, and thou shalt be saved, and thy house." },
  { ref: "Acts 17:11", text: "These were more noble than those in Thessalonica, in that they received the word with all readiness of mind, and searched the scriptures daily, whether those things were so." },
  { ref: "Acts 20:35", text: "I have shewed you all things, how that so labouring ye ought to support the weak, and to remember the words of the Lord Jesus, how he said, It is more blessed to give than to receive." },

  // PAUL'S EPISTLES (Romans - Philemon)
  { ref: "Romans 1:16", text: "For I am not ashamed of the gospel of Christ: for it is the power of God unto salvation to every one that believeth; to the Jew first, and also to the Greek." },
  { ref: "Romans 3:23", text: "For all have sinned, and come short of the glory of God;" },
  { ref: "Romans 5:8", text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us." },
  { ref: "Romans 6:23", text: "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord." },
  { ref: "Romans 8:1", text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit." },
  { ref: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
  { ref: "Romans 8:31", text: "What shall we then say to these things? If God be for us, who can be against us?" },
  { ref: "Romans 8:32", text: "He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?" },
  { ref: "Romans 8:38", text: "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come," },
  { ref: "Romans 8:39", text: "Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord." },
  { ref: "Romans 10:9", text: "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved." },
  { ref: "Romans 10:13", text: "For whosoever shall call upon the name of the Lord shall be saved." },
  { ref: "Romans 12:1", text: "I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service." },
  { ref: "Romans 12:2", text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God." },
  { ref: "Romans 12:12", text: "Rejoicing in hope; patient in tribulation; continuing instant in prayer;" },
  { ref: "Romans 13:10", text: "Love worketh no ill to his neighbour: therefore love is the fulfilling of the law." },
  { ref: "Romans 15:13", text: "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost." },
  { ref: "1 Corinthians 1:25", text: "Because the foolishness of God is wiser than men; and the weakness of God is stronger than men." },
  { ref: "1 Corinthians 2:9", text: "But as it is written, Eye hath not seen, nor ear heard, neither have entered into the heart of man, the things which God hath prepared for them that love him." },
  { ref: "1 Corinthians 10:13", text: "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it." },
  { ref: "1 Corinthians 10:31", text: "Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God." },
  { ref: "1 Corinthians 11:1", text: "Be ye followers of me, even as I also am of Christ." },
  { ref: "1 Corinthians 13:4", text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up," },
  { ref: "1 Corinthians 13:5", text: "Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil;" },
  { ref: "1 Corinthians 13:6", text: "Rejoiceth not in iniquity, but rejoiceth in the truth;" },
  { ref: "1 Corinthians 13:7", text: "Beareth all things, believeth all things, hopeth all things, endureth all things." },
  { ref: "1 Corinthians 13:8", text: "Charity never faileth: but whether there be prophecies, they shall fail; whether there be tongues, they shall cease; whether there be knowledge, it shall vanish away." },
  { ref: "1 Corinthians 13:13", text: "And now abideth faith, hope, charity, these three; but the greatest of these is charity." },
  { ref: "1 Corinthians 15:3", text: "For I delivered unto you first of all that which I also received, how that Christ died for our sins according to the scriptures;" },
  { ref: "1 Corinthians 15:4", text: "And that he was buried, and that he rose again the third day according to the scriptures:" },
  { ref: "1 Corinthians 15:57", text: "But thanks be to God, which giveth us the victory through our Lord Jesus Christ." },
  { ref: "2 Corinthians 4:16", text: "For which cause we faint not; but though our outward man perish, yet the inward man is renewed day by day." },
  { ref: "2 Corinthians 4:17", text: "For our light affliction, which is but for a moment, worketh for us a far more exceeding and eternal weight of glory;" },
  { ref: "2 Corinthians 5:7", text: "(For we walk by faith, not by sight:)" },
  { ref: "2 Corinthians 5:17", text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new." },
  { ref: "2 Corinthians 5:21", text: "For he hath made him to be sin for us, who knew no sin; that we might be made the righteousness of God in him." },
  { ref: "2 Corinthians 9:6", text: "But this I say, He which soweth sparingly shall reap also sparingly; and he which soweth bountifully shall reap also bountifully." },
  { ref: "2 Corinthians 9:7", text: "Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver." },
  { ref: "2 Corinthians 12:9", text: "And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness. Most gladly therefore will I rather glory in my infirmities, that the power of Christ may rest upon me." },
  { ref: "Galatians 2:20", text: "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me." },
  { ref: "Galatians 5:22", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith," },
  { ref: "Galatians 5:23", text: "Meekness, temperance: against such there is no law." },
  { ref: "Galatians 6:7", text: "Be not deceived; God is not mocked: for whatsoever a man soweth, that shall he also reap." },
  { ref: "Galatians 6:9", text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not." },
  { ref: "Ephesians 1:4", text: "According as he hath chosen us in him before the foundation of the world, that we should be holy and without blame before him in love:" },
  { ref: "Ephesians 2:4", text: "But God, who is rich in mercy, for his great love wherewith he loved us," },
  { ref: "Ephesians 2:5", text: "Even when we were dead in sins, hath quickened us together with Christ, (by grace ye are saved;)" },
  { ref: "Ephesians 2:8", text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:" },
  { ref: "Ephesians 2:9", text: "Not of works, lest any man should boast." },
  { ref: "Ephesians 2:10", text: "For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them." },
  { ref: "Ephesians 3:20", text: "Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us," },
  { ref: "Ephesians 4:2", text: "With all lowliness and meekness, with longsuffering, forbearing one another in love;" },
  { ref: "Ephesians 4:26", text: "Be ye angry, and sin not: let not the sun go down upon your wrath:" },
  { ref: "Ephesians 4:32", text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you." },
  { ref: "Ephesians 5:8", text: "For ye were sometimes darkness, but now are ye light in the Lord: walk as children of light:" },
  { ref: "Ephesians 5:19", text: "Speaking to yourselves in psalms and hymns and spiritual songs, singing and making melody in your heart to the Lord;" },
  { ref: "Ephesians 5:25", text: "Husbands, love your wives, even as Christ also loved the church, and gave himself for it;" },
  { ref: "Ephesians 6:1", text: "Children, obey your parents in the Lord: for this is right." },
  { ref: "Ephesians 6:4", text: "And, ye fathers, provoke not your children to wrath: but bring them up in the nurture and admonition of the Lord." },
  { ref: "Ephesians 6:10", text: "Finally, my brethren, be strong in the Lord, and in the power of his might." },
  { ref: "Ephesians 6:11", text: "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil." },
  { ref: "Ephesians 6:12", text: "For we wrestle not against flesh and blood, but against principalities, against powers, against the rulers of the darkness of this world, against spiritual wickedness in high places." },
  { ref: "Ephesians 6:13", text: "Wherefore take unto you the whole armour of God, that ye may be able to withstand in the evil day, and having done all, to stand." },
  { ref: "Philippians 1:6", text: "Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ:" },
  { ref: "Philippians 2:5", text: "Let this mind be in you, which was also in Christ Jesus:" },
  { ref: "Philippians 3:14", text: "I press toward the mark for the prize of the high calling of God in Christ Jesus." },
  { ref: "Philippians 4:4", text: "Rejoice in the Lord alway: and again I say, Rejoice." },
  { ref: "Philippians 4:6", text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God." },
  { ref: "Philippians 4:7", text: "And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus." },
  { ref: "Philippians 4:8", text: "Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things." },
  { ref: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." },
  { ref: "Philippians 4:19", text: "But my God shall supply all your need according to his riches in glory by Christ Jesus." },
  { ref: "Colossians 1:16", text: "For by him were all things created, that are in heaven, and that are in earth, visible and invisible, whether they be thrones, or dominions, or principalities, or powers: all things were created by him, and for him:" },
  { ref: "Colossians 3:2", text: "Set your affection on things above, not on things on the earth." },
  { ref: "Colossians 3:12", text: "Put on therefore, as the elect of God, holy and beloved, bowels of mercies, kindness, humbleness of mind, meekness, longsuffering;" },
  { ref: "Colossians 3:13", text: "Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye." },
  { ref: "Colossians 3:14", text: "And above all these things put on charity, which is the bond of perfectness." },
  { ref: "Colossians 3:15", text: "And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful." },
  { ref: "Colossians 3:16", text: "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another in psalms and hymns and spiritual songs, singing with grace in your hearts to the Lord." },
  { ref: "Colossians 3:17", text: "And whatsoever ye do in word or deed, do all in the name of the Lord Jesus, giving thanks to God and the Father by him." },
  { ref: "1 Thessalonians 4:11", text: "And that ye study to be quiet, and to do your own business, and to work with your own hands, as we commanded you;" },
  { ref: "1 Thessalonians 5:16", text: "Rejoice evermore." },
  { ref: "1 Thessalonians 5:17", text: "Pray without ceasing." },
  { ref: "1 Thessalonians 5:18", text: "In every thing give thanks: for this is the will of God in Christ Jesus concerning you." },
  { ref: "1 Thessalonians 5:22", text: "Abstain from all appearance of evil." },
  { ref: "2 Thessalonians 3:3", text: "But the Lord is faithful, who shall stablish you, and keep you from evil." },
  { ref: "1 Timothy 2:5", text: "For there is one God, and one mediator between God and men, the man Christ Jesus;" },
  { ref: "1 Timothy 6:10", text: "For the love of money is the root of all evil: which while some coveted after, they have erred from the faith, and pierced themselves through with many sorrows." },
  { ref: "2 Timothy 1:7", text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind." },
  { ref: "2 Timothy 2:15", text: "Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth." },
  { ref: "2 Timothy 3:16", text: "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:" },
  { ref: "2 Timothy 3:17", text: "That the man of God may be perfect, throughly furnished unto all good works." },
  { ref: "2 Timothy 4:7", text: "I have fought a good fight, I have finished my course, I have kept the faith:" },
  { ref: "2 Timothy 4:8", text: "Henceforth there is laid up for me a crown of righteousness, which the Lord, the righteous judge, shall give me at that day: and not to me only, but unto all them also that love his appearing." },

  // GENERAL EPISTLES (Hebrews - Jude)
  { ref: "Hebrews 4:12", text: "For the word of God is quick, and powerful, and sharper than any twoedged sword, piercing even to the dividing asunder of soul and spirit, and of the joints and marrow, and is a discerner of the thoughts and intents of the heart." },
  { ref: "Hebrews 4:16", text: "Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need." },
  { ref: "Hebrews 10:25", text: "Not forsaking the assembling of ourselves together, as the manner of some is; but exhorting one another: and so much the more, as ye see the day approaching." },
  { ref: "Hebrews 11:1", text: "Now faith is the substance of things hoped for, the evidence of things not seen." },
  { ref: "Hebrews 11:6", text: "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him." },
  { ref: "Hebrews 12:1", text: "Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us," },
  { ref: "Hebrews 12:2", text: "Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross, despising the shame, and is set down at the right hand of the throne of God." },
  { ref: "Hebrews 13:5", text: "Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee." },
  { ref: "Hebrews 13:8", text: "Jesus Christ the same yesterday, and to day, and for ever." },
  { ref: "James 1:2", text: "My brethren, count it all joy when ye fall into divers temptations;" },
  { ref: "James 1:3", text: "Knowing this, that the trying of your faith worketh patience." },
  { ref: "James 1:4", text: "But let patience have her perfect work, that ye may be perfect and entire, wanting nothing." },
  { ref: "James 1:5", text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him." },
  { ref: "James 1:17", text: "Every good gift and every perfect gift is from above, and cometh down from the Father of lights, with whom is no variableness, neither shadow of turning." },
  { ref: "James 2:17", text: "Even so faith, if it hath not works, is dead, being alone." },
  { ref: "James 2:26", text: "For as the body without the spirit is dead, so faith without works is dead also." },
  { ref: "James 3:5", text: "Even so the tongue is a little member, and boasteth great things. Behold, how great a matter a little fire kindleth!" },
  { ref: "James 4:7", text: "Submit yourselves therefore to God. Resist the devil, and he will flee from you." },
  { ref: "James 4:8", text: "Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded." },
  { ref: "James 5:16", text: "Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much." },
  { ref: "1 Peter 2:9", text: "But ye are a chosen generation, a royal priesthood, an holy nation, a peculiar people; that ye should shew forth the praises of him who hath called you out of darkness into his marvellous light;" },
  { ref: "1 Peter 3:15", text: "But sanctify the Lord God in your hearts: and be ready always to give an answer to every man that asketh you a reason of the hope that is in you with meekness and fear:" },
  { ref: "1 Peter 5:7", text: "Casting all your care upon him; for he careth for you." },
  { ref: "1 Peter 5:8", text: "Be sober, be vigilant; because your adversary the devil, as a roaring lion, walketh about, seeking whom he may devour:" },
  { ref: "2 Peter 1:21", text: "For the prophecy came not in old time by the will of man: but holy men of God spake as they were moved by the Holy Ghost." },
  { ref: "2 Peter 3:9", text: "The Lord is not slack concerning his promise, as some men count slackness; but is longsuffering to us-ward, not willing that any should perish, but that all should come to repentance." },
  { ref: "1 John 1:9", text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness." },
  { ref: "1 John 2:1", text: "My little children, these things write I unto you, that ye sin not. And if any man sin, we have an advocate with the Father, Jesus Christ the righteous:" },
  { ref: "1 John 2:2", text: "And he is the propitiation for our sins: and not for ours only, but also for the sins of the whole world." },
  { ref: "1 John 2:15", text: "Love not the world, neither the things that are in the world. If any man love the world, the love of the Father is not in him." },
  { ref: "1 John 3:1", text: "Behold, what manner of love the Father hath bestowed upon us, that we should be called the sons of God: therefore the world knoweth us not, because it knew him not." },
  { ref: "1 John 3:18", text: "My little children, let us not love in word, neither in tongue; but in deed and in truth." },
  { ref: "1 John 4:7", text: "Beloved, let us love one another: for love is of God; and every one that loveth is born of God, and knoweth God." },
  { ref: "1 John 4:8", text: "He that loveth not knoweth not God; for God is love." },
  { ref: "1 John 4:9", text: "In this was manifested the love of God toward us, because that God sent his only begotten Son into the world, that we might live through him." },
  { ref: "1 John 4:10", text: "Herein is love, not that we loved God, but that he loved us, and sent his Son to be the propitiation for our sins." },
  { ref: "1 John 4:11", text: "Beloved, if God so loved us, we ought also to love one another." },
  { ref: "1 John 4:12", text: "No man hath seen God at any time. If we love one another, God dwelleth in us, and his love is perfected in us." },
  { ref: "1 John 4:16", text: "And we have known and believed the love that God hath to us. God is love; and he that dwelleth in love dwelleth in God, and God in him." },
  { ref: "1 John 4:18", text: "There is no fear in love; but perfect love casteth out fear: because fear hath torment. He that feareth is not made perfect in love." },
  { ref: "1 John 4:19", text: "We love him, because he first loved us." },
  { ref: "1 John 5:4", text: "For whatsoever is born of God overcometh the world: and this is the victory that overcometh the world, even our faith." },
  { ref: "1 John 5:14", text: "And this is the confidence that we have in him, that, if we ask any thing according to his will, he heareth us:" },
  { ref: "Jude 1:24", text: "Now unto him that is able to keep you from falling, and to present you faultless before the presence of his glory with exceeding joy," },
  { ref: "Jude 1:25", text: "To the only wise God our Saviour, be glory and majesty, dominion and power, both now and ever. Amen." },

  // REVELATION
  { ref: "Revelation 1:8", text: "I am Alpha and Omega, the beginning and the ending, saith the Lord, which is, and which was, and which is to come, the Almighty." },
  { ref: "Revelation 3:20", text: "Behold, I stand at the door, and knock: if any man hear my voice, and open the door, I will come in to him, and will sup with him, and he with me." },
  { ref: "Revelation 21:1", text: "And I saw a new heaven and a new earth: for the first heaven and the first earth were passed away; and there was no more sea." },
  { ref: "Revelation 21:4", text: "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away." },
  { ref: "Revelation 21:6", text: "And he said unto me, It is done. I am Alpha and Omega, the beginning and the end. I will give unto him that is athirst of the fountain of the water of life freely." },
  { ref: "Revelation 22:12", text: "And, behold, I come quickly; and my reward is with me, to give every man according as his work shall be." },
  { ref: "Revelation 22:20", text: "He which testifieth these things saith, Surely I come quickly. Amen. Even so, come, Lord Jesus." },
  { ref: "Revelation 22:21", text: "The grace of our Lord Jesus Christ be with you all. Amen." }
  // Add more verses as needed
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

    console.log('📖 Fetching:', url);
    
    //const response = await fetch(url);
    //if (!response.ok) throw new Error(`API returned ${response.status}`);

    // Try up to 3 times with delay
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (response.status === 429) {
        // Rate limited - wait and retry
        console.log(`⏳ Rate limited, retrying in ${(attempt + 1) * 2}s...`);
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
      } else {
        break;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`API returned ${response?.status || 'error'}`);
    }
    
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

// ============ GET BIBLE CHAPTER ============
app.get('/api/bible/:book/:chapter', async (req, res) => {
  const { book, chapter } = req.params;
  const translation = (req.query.translation || 'kjv').toLowerCase();
  
  console.log('📖 Fetching:', `${book} ${chapter} (${translation})`);
  
  // Generate fallback verses in case API fails
  const fallbackVerses = [];
  const maxVerses = book === 'Psalms' || book === 'Psalm' ? 176 : 40;
  for (let i = 1; i <= maxVerses; i++) {
    fallbackVerses.push({
      book: book,
      chapter: parseInt(chapter),
      verse: i,
      text: `${book} ${chapter}:${i} - Content unavailable offline`,
      translation: translation.toUpperCase()
    });
  }
  
  try {
    const url = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${translation}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.verses && data.verses.length > 0) {
        const verses = data.verses.map((v) => ({
          book: v.book_name || book,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text.trim(),
          translation: translation.toUpperCase()
        }));
        
        console.log(`✅ API: ${verses.length} verses`);
        return res.json({ success: true, data: verses, source: 'api' });
      }
    }
    
    // API failed - return fallback
    console.log('⚠️ API failed, using fallback');
    res.json({ success: true, data: fallbackVerses, source: 'fallback' });
    
  } catch (error) {
    // Always return fallback, never 500
    console.log('⚠️ Error, using fallback:', error.message);
    res.json({ success: true, data: fallbackVerses, source: 'fallback' });
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

// Text-to-Speech proxy
app.get('/api/tts', async (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'Text required' });
  
  try {
    // Use a free TTS API
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(text)}&tl=en`;
    const response = await fetch(url);
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(buffer));
    } else {
      res.status(500).json({ error: 'TTS failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Load the Bible data at startup
let BIBLE = {};
try {
  const biblePath = path.join(__dirname, 'data', 'bible-kjv.json');
  if (fs.existsSync(biblePath)) {
    BIBLE = JSON.parse(fs.readFileSync(biblePath, 'utf8'));
    console.log(`✅ Bible loaded: ${Object.keys(BIBLE).length} books`);
  }
} catch (e) {
  console.log('⚠️ Bible file not found, using API fallback');
}

// ============ SEARCH FULL BIBLE (LOCAL) ============
app.get('/api/bible/search', async (req, res) => {
  const { q, translation = 'kjv' } = req.query;
  
  if (!q || q.toString().trim().length < 2) {
    return res.json({ success: false, results: [], count: 0 });
  }
  
  const searchTerm = q.toString().trim().toLowerCase();
  const results = [];
  
  // Search through the ENTIRE local Bible
  for (const [book, chapters] of Object.entries(BIBLE)) {
    for (const [chapter, verses] of Object.entries(chapters)) {
      for (const [verse, text] of Object.entries(verses)) {
        if (text.toLowerCase().includes(searchTerm)) {
          results.push({
            reference: `${book} ${chapter}:${verse}`,
            text: text,
            book: book,
            chapter: parseInt(chapter),
            verse: parseInt(verse),
            translation: translation.toUpperCase()
          });
          
          // Limit to 100 results
          if (results.length >= 100) break;
        }
      }
      if (results.length >= 100) break;
    }
    if (results.length >= 100) break;
  }
  
  console.log(`✅ Found ${results.length} results for "${searchTerm}"`);
  res.json({ success: true, query: searchTerm, results, count: results.length });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
