const bibleApiService = require('../services/bibleApiService');

exports.getVerses = async (req, res) => {
  const { translation, book, chapter, verse } = req.params;
  
  try {
    const result = await bibleApiService.getVerses(translation, book, parseInt(chapter), verse ? parseInt(verse) : null);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        source: result.source,
        cached: false,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        message: `Could not fetch ${translation} ${book} ${chapter}${verse ? ':'+verse : ''}`
      });
    }
  } catch (error) {
    console.error('Error fetching verses:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

exports.getVerseOfTheDay = async (req, res) => {
  try {
    const result = await bibleApiService.fetchVerseOfTheDay();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        source: result.source,
        cached: false,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback to a default verse
      const fallback = await bibleApiService.getVerses('KJV', 'John', 3, 16);
      res.json({
        success: true,
        data: {
          reference: 'John 3:16',
          text: fallback.success ? fallback.data[0].text : 'For God so loved the world...',
          translation: 'KJV'
        },
        source: 'fallback'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.searchVerses = async (req, res) => {
  const { q, translation = 'KJV', book } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }
  
  try {
    // bible4u supports search via their API
    const searchUrl = `https://bible4u.net/api/v1/search/${translation.toUpperCase()}?q=${encodeURIComponent(q)}${book ? `&book=${book}` : ''}`;
    const axios = require('axios');
    const response = await axios.get(searchUrl, { timeout: 5000 });
    
    res.json({
      success: true,
      query: q,
      translation,
      results: response.data.results || [],
      count: response.data.results?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
};

exports.getSupportedTranslations = (req, res) => {
  res.json({
    translations: [
      { code: 'KJV', name: 'King James Version', publicDomain: true, requiresKey: false },
      { code: 'ASV', name: 'American Standard Version', publicDomain: true, requiresKey: false },
      { code: 'YLT', name: 'Young\'s Literal Translation', publicDomain: true, requiresKey: false },
      { code: 'BBE', name: 'Bible in Basic English', publicDomain: true, requiresKey: false },
      { code: 'ESV', name: 'English Standard Version', publicDomain: false, requiresKey: true },
      { code: 'NIV', name: 'New International Version', publicDomain: false, requiresKey: true, requiresLicense: true },
      { code: 'NLT', name: 'New Living Translation', publicDomain: false, requiresKey: true, requiresLicense: true }
    ]
  });
};