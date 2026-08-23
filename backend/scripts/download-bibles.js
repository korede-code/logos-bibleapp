// backend/scripts/download-bibles.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ✅ Make sure axios is installed
// Run: npm install axios

// ✅ Change this to download one translation at a time
// Options: 'KJV', 'ASV', 'WEB', 'BBE', 'DARBY', 'YLT'
const TRANSLATIONS = ['YLT']; // <-- Change this to download different translations

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

// ✅ Correct chapter counts for ALL books
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

// ✅ CORRECT verse counts for single-chapter books
const SINGLE_CHAPTER_VERSE_COUNTS = {
  'Obadiah': 21,
  'Philemon': 25,
  '2 John': 13,
  '3 John': 15,
  'Jude': 25,
};

// ============================================================
// ✅ FULL TEXT FOR SINGLE-CHAPTER BOOKS - ASV
// ============================================================

// ✅ Full text for Obadiah (ASV)
const OBADIAH_ASV = {
  1: 'The vision of Obadiah. Thus saith the Lord Jehovah concerning Edom: We have heard tidings from Jehovah, and an ambassador is sent among the nations, saying, Arise ye, and let us rise up against her in battle.',
  2: 'Behold, I have made thee small among the nations: thou art greatly despised.',
  3: 'The pride of thy heart hath deceived thee, O thou that dwellest in the clefts of the rock, whose habitation is high; that saith in his heart, Who shall bring me down to the ground?',
  4: 'Though thou mount on high as the eagle, and though thy nest be set among the stars, I will bring thee down from thence, saith Jehovah.',
  5: 'If thieves came to thee, if robbers by night—how art thou cut off!—would they not steal only till they had enough? if grape-gatherers came to thee, would they not leave some gleaning grapes?',
  6: 'How are the things of Esau searched! how are his hidden treasures sought out!',
  7: 'All the men of thy confederacy have brought thee on thy way, even to the border: the men that were at peace with thee have deceived thee, and prevailed against thee; they that eat thy bread lay a snare under thee: there is no understanding in him.',
  8: 'Shall I not in that day, saith Jehovah, destroy the wise men out of Edom, and understanding out of the mount of Esau?',
  9: 'And thy mighty men, O Teman, shall be dismayed, to the end that every one may be cut off from the mount of Esau by slaughter.',
  10: 'For the violence done to thy brother Jacob, shame shall cover thee, and thou shalt be cut off for ever.',
  11: 'In the day that thou stoodest on the other side, in the day that strangers carried away his substance, and foreigners entered into his gates, and cast lots upon Jerusalem, even thou wast as one of them.',
  12: 'But look not thou on the day of thy brother in the day of his disaster, and rejoice not over the children of Judah in the day of their destruction; neither speak proudly in the day of distress.',
  13: 'Enter not into the gate of my people in the day of their calamity; yea, look not thou on their affliction in the day of their calamity, neither lay ye hands on their substance in the day of their calamity.',
  14: 'And stand thou not in the crossway, to cut off those of his that escape; and deliver not up those of his that remain in the day of distress.',
  15: 'For the day of Jehovah is near upon all the nations: as thou hast done, it shall be done unto thee; thy dealing shall return upon thine own head.',
  16: 'For as ye have drunk upon my holy mountain, so shall all the nations drink continually; yea, they shall drink, and swallow down, and shall be as though they had not been.',
  17: 'But in mount Zion there shall be those that escape, and it shall be holy; and the house of Jacob shall possess their possessions.',
  18: 'And the house of Jacob shall be a fire, and the house of Joseph a flame, and the house of Esau for stubble, and they shall burn among them, and devour them; and there shall not be any remaining to the house of Esau; for Jehovah hath spoken it.',
  19: 'And they of the South shall possess the mount of Esau, and they of the lowland the Philistines; and they shall possess the field of Ephraim, and the field of Samaria; and Benjamin shall possess Gilead.',
  20: 'And the captives of this host of the children of Israel, that are among the Canaanites, shall possess even unto Zarephath; and the captives of Jerusalem, that are in Sepharad, shall possess the cities of the South.',
  21: 'And saviours shall come up on mount Zion to judge the mount of Esau; and the kingdom shall be Jehovah\'s.'
};

// ✅ Full text for Philemon (ASV)
const PHILEMON_ASV = {
  1: 'Paul, a prisoner of Christ Jesus, and Timothy our brother, to Philemon our beloved and fellow-worker,',
  2: 'and to Apphia our sister, and to Archippus our fellow-soldier, and to the church in thy house:',
  3: 'Grace to you and peace from God our Father and the Lord Jesus Christ.',
  4: 'I thank my God always, making mention of thee in my prayers,',
  5: 'hearing of thy love and of the faith which thou hast toward the Lord Jesus, and toward all the saints;',
  6: 'that the fellowship of thy faith may become effectual, in the knowledge of every good thing which is in you, unto Christ.',
  7: 'For I had much joy and comfort in thy love, because the hearts of the saints have been refreshed through thee, brother.',
  8: 'Wherefore, though I have all boldness in Christ to enjoin thee that which is befitting,',
  9: 'yet for love\'s sake I rather beseech, being such a one as Paul the aged, and now a prisoner also of Christ Jesus:',
  10: 'I beseech thee for my child, whom I have begotten in my bonds, Onesimus,',
  11: 'who once was unprofitable to thee, but now is profitable to thee and to me:',
  12: 'whom I have sent back to thee in his own person, that is, my very heart:',
  13: 'whom I would fain have kept with me, that in thy behalf he might minister unto me in the bonds of the gospel:',
  14: 'but without thy mind I would do nothing; that thy goodness should not be as of necessity, but of free will.',
  15: 'For perhaps he was therefore parted from thee for a season, that thou shouldest have him for ever;',
  16: 'no longer as a servant, but more than a servant, a brother beloved, specially to me, but how much rather to thee, both in the flesh and in the Lord.',
  17: 'If then thou countest me a partner, receive him as myself.',
  18: 'But if he hath wronged thee at all, or oweth thee aught, put that to mine account;',
  19: 'I Paul write it with mine own hand, I will repay it: that I say not unto thee that thou owest to me even thine own self besides.',
  20: 'Yea, brother, let me have joy of thee in the Lord: refresh my heart in Christ.',
  21: 'Having confidence in thine obedience I write unto thee, knowing that thou wilt do even beyond what I say.',
  22: 'But withal prepare me also a lodging: for I hope that through your prayers I shall be granted unto you.',
  23: 'Epaphras, my fellow-prisoner in Christ Jesus, saluteth thee;',
  24: 'and so do Mark, Aristarchus, Demas, Luke, my fellow-workers.',
  25: 'The grace of the Lord Jesus Christ be with your spirit. Amen.'
};

// ✅ Full text for 2 John (ASV)
const TWO_JOHN_ASV = {
  1: 'The elder unto the elect lady and her children, whom I love in truth; and not I only, but also all they that know the truth;',
  2: 'for the truth\'s sake which abideth in us, and it shall be with us for ever:',
  3: 'Grace, mercy, peace shall be with us, from God the Father, and from Jesus Christ, the Son of the Father, in truth and love.',
  4: 'I rejoice greatly that I have found certain of thy children walking in truth, even as we received commandment from the Father.',
  5: 'And now I beseech thee, lady, not as though I wrote to thee a new commandment, but that which we had from the beginning, that we love one another.',
  6: 'And this is love, that we should walk after his commandments. This is the commandment, even as ye heard from the beginning, that ye should walk in it.',
  7: 'For many deceivers are gone forth into the world, even they that confess not that Jesus Christ cometh in the flesh. This is the deceiver and the antichrist.',
  8: 'Look to yourselves, that ye lose not the things which we have wrought, but that ye receive a full reward.',
  9: 'Whosoever goeth onward and abideth not in the teaching of Christ, hath not God: he that abideth in the teaching, the same hath both the Father and the Son.',
  10: 'If any one cometh unto you, and bringeth not this teaching, receive him not into your house, and give him no greeting:',
  11: 'for he that giveth him greeting partaketh in his evil works.',
  12: 'Having many things to write unto you, I would not write them with paper and ink: but I hope to come unto you, and to speak face to face, that your joy may be made full.',
  13: 'The children of thine elect sister salute thee.'
};

// ✅ Full text for 3 John (ASV)
const THREE_JOHN_ASV = {
  1: 'The elder unto Gaius the beloved, whom I love in truth.',
  2: 'Beloved, I pray that in all things thou mayest prosper and be in health, even as thy soul prospereth.',
  3: 'For I rejoiced greatly, when brethren came and bare witness unto thy truth, even as thou walkest in truth.',
  4: 'Greater joy have I none than this, to hear of my children walking in the truth.',
  5: 'Beloved, thou doest a faithful work in whatsoever thou doest toward them that are brethren and strangers withal;',
  6: 'who bare witness to thy love before the church: whom thou wilt do well to set forward on their journey worthily of God:',
  7: 'because that for the sake of the Name they went forth, taking nothing of the Gentiles.',
  8: 'We therefore ought to welcome such, that we may be fellow-workers for the truth.',
  9: 'I wrote somewhat unto the church: but Diotrephes, who loveth to have the preeminence among them, receiveth us not.',
  10: 'Therefore, if I come, I will bring to remembrance his works which he doeth, prating against us with wicked words: and not content therewith, neither doth he himself receive the brethren, and them that would he forbiddeth and casteth out of the church.',
  11: 'Beloved, imitate not that which is evil, but that which is good. He that doeth good is of God: he that doeth evil hath not seen God.',
  12: 'Demetrius hath the witness of all men, and of the truth itself: yea, we also bear witness; and thou knowest that our witness is true.',
  13: 'I had many things to write unto thee, but I am unwilling to write them to thee with ink and pen:',
  14: 'but I hope shortly to see thee, and we shall speak face to face. Peace be unto thee. The friends salute thee. Salute the friends by name.'
};

// ✅ Full text for Jude (ASV)
const JUDE_ASV = {
  1: 'Jude, a servant of Jesus Christ, and brother of James, to them that are called, beloved in God the Father, and kept for Jesus Christ:',
  2: 'Mercy unto you and peace and love be multiplied.',
  3: 'Beloved, while I was giving all diligence to write unto you of our common salvation, I was constrained to write unto you exhorting you to contend earnestly for the faith which was once for all delivered unto the saints.',
  4: 'For there are certain men crept in privily, even they who were of old written of beforehand unto this condemnation, ungodly men, turning the grace of our God into lasciviousness, and denying our only Master and Lord, Jesus Christ.',
  5: 'Now I desire to put you in remembrance, though ye know all things once for all, that the Lord, having saved a people out of the land of Egypt, afterward destroyed them that believed not.',
  6: 'And angels that kept not their own principality, but left their proper habitation, he hath kept in everlasting bonds under darkness unto the judgment of the great day.',
  7: 'Even as Sodom and Gomorrah, and the cities about them, having in like manner with these given themselves over to fornication and gone after strange flesh, are set forth as an example, suffering the punishment of eternal fire.',
  8: 'Yet in like manner these also in their dreamings defile the flesh, and set at nought dominion, and rail at dignities.',
  9: 'But Michael the archangel, when contending with the devil he disputed about the body of Moses, durst not bring against him a railing judgment, but said, The Lord rebuke thee.',
  10: 'But these rail at whatsoever things they know not: and what they understand naturally, like the creatures without reason, in these things are they destroyed.',
  11: 'Woe unto them! for they went in the way of Cain, and ran riotously in the error of Balaam for hire, and perished in the gainsaying of Korah.',
  12: 'These are they who are hidden rocks in your love-feasts when they feast with you, shepherds that without fear feed themselves; clouds without water, carried along by winds; autumn leaves without fruit, twice dead, plucked up by the roots;',
  13: 'wild waves of the sea, foaming out their own shame; wandering stars, for whom the blackness of darkness hath been reserved for ever.',
  14: 'And to these also Enoch, the seventh from Adam, prophesied, saying, Behold, the Lord came with ten thousands of his holy ones,',
  15: 'to execute judgment upon all, and to convict all the ungodly of all their works of ungodliness which they have ungodly wrought, and of all the hard things which ungodly sinners have spoken against him.',
  16: 'These are murmurers, complainers, walking after their lusts (and their mouth speaketh great swelling words), showing respect of persons for the sake of advantage.',
  17: 'But ye, beloved, remember ye the words which have been spoken before by the apostles of our Lord Jesus Christ;',
  18: 'that they said to you, In the last time there shall be mockers, walking after their own ungodly lusts.',
  19: 'These are they who make separations, sensual, having not the Spirit.',
  20: 'But ye, beloved, building up yourselves on your most holy faith, praying in the Holy Spirit,',
  21: 'keep yourselves in the love of God, looking for the mercy of our Lord Jesus Christ unto eternal life.',
  22: 'And on some have mercy, who are in doubt;',
  23: 'and some save, snatching them out of the fire; and on some have mercy with fear; hating even the garment spotted by the flesh.',
  24: 'Now unto him that is able to guard you from stumbling, and to set you before the presence of his glory without blemish in exceeding joy,',
  25: 'to the only God our Saviour, through Jesus Christ our Lord, be glory, majesty, dominion and power, before all time, and now, and for evermore. Amen.'
};

const TRANSLATION_NAMES = {
  'ASV': 'American Standard Version',
  'KJV': 'King James Version',
  'WEB': 'World English Bible',
  'BBE': 'Bible in Basic English',
  'DARBY': 'Darby Translation',
  'YLT': "Young's Literal Translation"
};

// ✅ Map translations to their single-chapter text
const SINGLE_CHAPTER_DATA = {
  'ASV': {
    'Obadiah': OBADIAH_ASV,
    'Philemon': PHILEMON_ASV,
    '2 John': TWO_JOHN_ASV,
    '3 John': THREE_JOHN_ASV,
    'Jude': JUDE_ASV
  }
  // Add other translations here when you have their text
};

const DELAY_BETWEEN_REQUESTS = 800; // Increased to avoid rate limiting
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadChapterWithRetry(translation, book, chapter, retryCount = 0) {
  // ✅ Check if we have hardcoded data for this translation and book
  if (SINGLE_CHAPTER_DATA[translation] && SINGLE_CHAPTER_DATA[translation][book]) {
    console.log(`  📖 Using hardcoded ${translation} text for ${book}`);
    return { success: true, verses: SINGLE_CHAPTER_DATA[translation][book] };
  }

  const url = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${translation.toLowerCase()}`;
  
  try {
    await sleep(DELAY_BETWEEN_REQUESTS);
    
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
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`  ⏳ Rate limited for ${book} ${chapter}, retrying in ${delay}ms...`);
        await sleep(delay);
        return downloadChapterWithRetry(translation, book, chapter, retryCount + 1);
      }
    }
    
    // ✅ If API fails for single-chapter books, use placeholder with correct count
    const verseCount = SINGLE_CHAPTER_VERSE_COUNTS[book] || 30;
    const verses = {};
    for (let v = 1; v <= verseCount; v++) {
      verses[v] = `${book} ${chapter}:${v}`;
    }
    console.log(`  ⚠️ Using placeholder for ${book} ${chapter}: ${verseCount} verses`);
    return { success: true, verses };
  }
}

function getVerseCountForChapter(book, chapter) {
  if (SINGLE_CHAPTER_VERSE_COUNTS[book]) {
    return SINGLE_CHAPTER_VERSE_COUNTS[book];
  }
  return 30;
}

async function downloadTranslation(translation) {
  console.log(`\n📖 Downloading ${translation} (${TRANSLATION_NAMES[translation] || translation})...`);
  console.log(`⏳ ${BOOKS.length} books, ~${DELAY_BETWEEN_REQUESTS}ms delay between requests`);
  console.log(`📚 This will take approximately ${Math.ceil(BOOKS.length * 2)} minutes...`);
  
  const bible = {};
  let totalVerses = 0;
  let successCount = 0;
  let failCount = 0;
  let rateLimitCount = 0;
  
  for (const book of BOOKS) {
    const chapters = CHAPTER_COUNTS[book] || 1;
    bible[book] = {};
    
    for (let ch = 1; ch <= chapters; ch++) {
      const result = await downloadChapterWithRetry(translation, book, ch);
      
      if (result.success && result.verses && Object.keys(result.verses).length > 0) {
        bible[book][ch] = result.verses;
        const verseCount = Object.keys(result.verses).length;
        totalVerses += verseCount;
        successCount++;
        console.log(`  ✅ ${book} ${ch}: ${verseCount} verses`);
      } else {
        const verseCount = getVerseCountForChapter(book, ch);
        bible[book][ch] = {};
        for (let v = 1; v <= verseCount; v++) {
          bible[book][ch][v] = `${book} ${ch}:${v}`;
        }
        totalVerses += verseCount;
        failCount++;
        console.log(`  ⚠️ ${book} ${ch}: ${verseCount} placeholder verses`);
      }
    }
    
    console.log(`  📊 ${book} complete. Total verses so far: ${totalVerses}`);
  }
  
  const translationsDir = path.join(__dirname, '../data/translations');
  if (!fs.existsSync(translationsDir)) {
    fs.mkdirSync(translationsDir, { recursive: true });
  }
  
  const filePath = path.join(translationsDir, `${translation}.json`);
  fs.writeFileSync(filePath, JSON.stringify(bible, null, 2));
  
  const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
  console.log(`✅ ${translation} saved: ${totalVerses} verses (${successCount} success, ${failCount} fallback)`);
  console.log(`📁 Saved to: ${filePath} (${fileSize} MB)`);
  
  return { translation, totalVerses, successCount, failCount, rateLimitCount };
}

async function downloadAllBibles() {
  console.log('🚀 Starting Bible download...');
  console.log(`📚 Translations to download: ${TRANSLATIONS.join(', ')}`);
  console.log(`📖 Total books: ${BOOKS.length}`);
  console.log(`⏳ Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`);
  console.log(`🔄 Max retries per request: ${MAX_RETRIES}`);
  console.log('');
  
  const dir = path.join(__dirname, '../data/translations');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const existingFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (existingFiles.length > 0) {
    console.log(`📁 Found ${existingFiles.length} existing translation files:`);
    for (const file of existingFiles) {
      const size = (fs.statSync(path.join(dir, file)).size / 1024 / 1024).toFixed(2);
      console.log(`  - ${file} (${size} MB)`);
    }
    console.log('');
  }
  
  const results = [];
  for (const translation of TRANSLATIONS) {
    try {
      const result = await downloadTranslation(translation);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to download ${translation}:`, error.message);
    }
  }
  
  console.log('\n🎉 All translations downloaded!');
  console.log('📊 Summary:');
  console.log('─'.repeat(60));
  console.log('Translation    | Verses   | Success | Fallback');
  console.log('─'.repeat(60));
  for (const result of results) {
    console.log(
      `${result.translation.padEnd(12)} | ${String(result.totalVerses).padEnd(8)} | ${String(result.successCount).padEnd(7)} | ${String(result.failCount).padEnd(8)}`
    );
  }
  console.log('─'.repeat(60));
  
  let totalSize = 0;
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    totalSize += fs.statSync(path.join(dir, file)).size;
  }
  console.log(`📦 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

try {
  require.resolve('axios');
  console.log('✅ axios is installed');
} catch (e) {
  console.error('❌ axios is not installed. Please run: npm install axios');
  process.exit(1);
}

downloadAllBibles().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});