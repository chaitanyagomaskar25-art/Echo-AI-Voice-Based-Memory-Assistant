/**
 * Centralized Production Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal server error occurred.';
  let details = [];

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Schema validation error occurred.';
    details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose Cast Error (Invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_RESOURCE_ID';
    message = `Resource not found or invalid ID format for field "${err.path}".`;
  }

  // MongoDB Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY_CONFLICT';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account or record with that ${field} already exists.`;
  }

  // JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Not authorized. Provided authentication token is invalid or corrupted.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Your session has expired. Please log in again.';
  }

  // Multer Upload Errors
  else if (err.name === 'MulterError') {
    statusCode = 400;
    errorCode = `UPLOAD_${err.code}`;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Audio file exceeds the maximum allowed size of 25 MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded in a single request.';
    } else {
      message = `File upload failed: ${err.message}`;
    }
  }

  // Log error with correlation ID
  console.error(
    `[Error] [${req.id || 'no-id'}] ${req.method} ${req.originalUrl || req.url} - ${statusCode} [${errorCode}]: ${err.message}`
  );
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details.length > 0 ? { details } : {}),
    },
    requestId: req.id || null,
    timestamp: new Date().toISOString(),
    ...(!isProduction && err.stack ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
