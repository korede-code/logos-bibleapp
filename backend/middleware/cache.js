// Simple in-memory cache with TTL
class Cache {
  constructor(defaultTTL = 3600) { // 1 hour default
    this.store = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expires = Date.now() + (ttl * 1000);
    this.store.set(key, { value, expires });
    
    // Auto-cleanup after expiry
    setTimeout(() => {
      if (this.store.has(key) && this.store.get(key).expires <= Date.now()) {
        this.store.delete(key);
      }
    }, ttl * 1000);
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expires <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  clear() {
    this.store.clear();
  }
}

const cache = new Cache();

// Middleware to check cache
const cacheMiddleware = (duration = 3600) => {
  return (req, res, next) => {
    const key = `api:${req.originalUrl}`;
    const cached = cache.get(key);
    
    if (cached) {
      console.log(`✅ Cache hit: ${key}`);
      return res.json({ ...cached, cached: true });
    }
    
    // Store original json method
    const originalJson = res.json;
    res.json = function(data) {
      cache.set(key, data, duration);
      originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = { cacheMiddleware, cache };