const crypto = require('crypto');

/**
 * Production Structured Request Logger & Correlation ID Tracking
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Generate or propagate correlation request ID
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const userId = req.user ? req.user._id : 'anonymous';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Highlight slow requests for performance monitoring (> 500ms)
    const isSlow = duration > 500;
    const logLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: statusCode,
      durationMs: duration,
      userId,
      clientIp,
      ...(isSlow ? { slowRequestWarning: true } : {}),
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      const slowMarker = isSlow ? ' 🐢 [SLOW]' : '';
      console.log(
        `[${logLevel}] [${requestId.slice(0, 8)}] ${req.method} ${req.originalUrl || req.url} ${statusCode} - ${duration}ms (User: ${userId})${slowMarker}`
      );
    }
  });

  next();
};

module.exports = requestLogger;
