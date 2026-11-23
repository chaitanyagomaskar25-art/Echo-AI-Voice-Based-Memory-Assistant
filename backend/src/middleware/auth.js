const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware: enforces authenticated session with valid JWT
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. No Bearer token provided in Authorization header.',
      },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'echo_voice_memory_jwt_secret_key_2026_super_secure'
    );

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The user account associated with this token no longer exists.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message:
          err.name === 'TokenExpiredError'
            ? 'Authentication session expired. Please sign in again.'
            : 'Authentication failed. Invalid token signature.',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Optional Auth middleware: attaches req.user if a valid token is provided.
 * If no token is provided or invalid, req.user remains null without aborting the request.
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'echo_voice_memory_jwt_secret_key_2026_super_secure'
      );
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    } catch (err) {
      // Ignored for optional authentication
    }
  }

  next();
};

/**
 * Authorize Resource Ownership middleware generator
 * Ensures the resource's user ID matches the authenticated user ID.
 */
const checkOwnership = (resourceUserId, currentUserId) => {
  if (!resourceUserId || !currentUserId) return false;
  return resourceUserId.toString() === currentUserId.toString();
};

module.exports = {
  protect,
  optionalAuth,
  checkOwnership,
};
