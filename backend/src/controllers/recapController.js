const recapService = require('../services/recapService');

/**
 * Get or generate daily/weekly recap (with automatic caching)
 * Query params:
 * - type: 'daily' | 'weekly' (default 'daily')
 * - date: ISO date string or YYYY-MM-DD (default current date)
 * - force: 'true' | 'false' (bypass cache and regenerate)
 */
exports.getRecap = async (req, res, next) => {
  try {
    const { type = 'daily', date, force } = req.query;
    const forceRefresh = force === 'true' || force === true;
    const targetDate = date ? new Date(date) : new Date();
    const userId = req.user ? req.user._id : null;

    if (type !== 'daily' && type !== 'weekly') {
      return res.status(400).json({
        success: false,
        message: 'Invalid recap type. Allowed values are "daily" or "weekly".',
      });
    }

    const result = await recapService.getOrGenerateRecap({
      type,
      date: targetDate,
      forceRefresh,
      userId,
    });

    res.json({
      success: true,
      data: result.recap,
      isCached: result.isCached,
      cachedAt: result.cachedAt || null,
      generatedAt: result.generatedAt || result.recap.generatedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get date-based history of past daily/weekly periods
 */
exports.getRecapHistory = async (req, res, next) => {
  try {
    const { type = 'daily', limit = 14 } = req.query;
    const userId = req.user ? req.user._id : null;

    const history = await recapService.getRecapHistory({
      type,
      limit: parseInt(limit, 10) || 14,
      userId,
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific recap by its MongoDB ID
 */
exports.getRecapById = async (req, res, next) => {
  try {
    const Recap = require('../models/Recap');
    const recap = await Recap.findById(req.params.id).populate('sourceMemories', 'title category createdAt');

    if (!recap) {
      return res.status(404).json({
        success: false,
        message: 'Recap not found',
      });
    }

    if (req.user && recap.user && String(recap.user) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this recap',
      });
    }

    res.json({
      success: true,
      data: recap,
    });
  } catch (error) {
    next(error);
  }
};
