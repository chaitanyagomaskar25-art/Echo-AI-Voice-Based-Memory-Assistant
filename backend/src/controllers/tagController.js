const Tag = require('../models/Tag');

// Get all tags
exports.getTags = async (req, res, next) => {
  try {
    const tags = await Tag.find().sort({ usageCount: -1 }).limit(30);
    res.json({ success: true, count: tags.length, data: tags });
  } catch (error) {
    next(error);
  }
};
