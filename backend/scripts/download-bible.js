// backend/scripts/download-bible.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function downloadBible() {
  console.log('📖 Downloading Bible data...');
  
  try {
    // Use the World English Bible (WEB) - public domain
    const response = await axios.get('https://raw.githubusercontent.com/JohnSmithDC/Bible-Database/master/web-complete.json', {
      timeout: 30000
    });
    
    const bibleData = response.data;
    const outputPath = path.join(__dirname, '../data/web-bible.json');
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(bibleData, null, 2));
    console.log(`✅ Bible data downloaded and saved to ${outputPath}`);
    console.log(`📊 Books count: ${Object.keys(bibleData).length}`);
    
    // Count total verses
    let totalVerses = 0;
    let totalChapters = 0;
    for (const [book, chapters] of Object.entries(bibleData)) {
      totalChapters += Object.keys(chapters).length;
      for (const [chapter, verses] of Object.entries(chapters)) {
        totalVerses += Object.keys(verses).length;
      }
    }
    console.log(`📊 Total chapters: ${totalChapters}`);
    console.log(`📊 Total verses: ${totalVerses}`);
    
  } catch (error) {
    console.error('❌ Failed to download Bible:', error.message);
  }
}

downloadBible();