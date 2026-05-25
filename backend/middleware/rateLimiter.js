const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

const rateLimitMiddleware = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await rateLimiter.consume(ip);
    next();
  } catch (error) {
    res.status(429).json({ 
      error: 'Too many requests', 
      message: 'Please wait before making more requests' 
    });
  }
};

module.exports = rateLimitMiddleware;