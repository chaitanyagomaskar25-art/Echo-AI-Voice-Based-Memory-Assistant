const rateLimit = require('express-rate-limit');

/**
 * Standardized rate limit response builder
 */
const createLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: message || 'Too many requests. Please slow down and try again later.',
    },
    requestId: req.id || null,
    timestamp: new Date().toISOString(),
  });
};

// General API Rate Limiter: 300 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Global API rate limit exceeded. Please try again in a few minutes.'),
});

// Authentication Rate Limiter: 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many authentication attempts. Please try again after 15 minutes.'),
});

// Audio Upload Rate Limiter: 40 uploads per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Audio upload frequency limit reached. Please wait a moment before recording again.'),
});

// AI Processing Rate Limiter: 60 queries per 15 minutes
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('AI processing request limit reached. Please wait before asking more questions.'),
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  aiLimiter,
};
