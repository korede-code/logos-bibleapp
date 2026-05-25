const express = require('express');
const router = express.Router();
const bibleController = require('../controllers/bibleController');
const rateLimitMiddleware = require('../middleware/rateLimiter');
const { cacheMiddleware } = require('../middleware/cache');

// Apply rate limiting to all routes
router.use(rateLimitMiddleware);

// Get chapter or verse
router.get('/:translation/:book/:chapter/:verse?', 
  cacheMiddleware(3600), // Cache for 1 hour
  bibleController.getVerses
);

// Verse of the Day
router.get('/votd', 
  cacheMiddleware(300), // Cache for 5 minutes
  bibleController.getVerseOfTheDay
);

// Search
router.get('/search', 
  cacheMiddleware(1800), // Cache for 30 minutes
  bibleController.searchVerses
);

// Get supported translations
router.get('/translations', 
  cacheMiddleware(86400), // Cache for 24 hours
  bibleController.getSupportedTranslations
);

module.exports = router;