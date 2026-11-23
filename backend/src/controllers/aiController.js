const Memory = require('../models/Memory');
const aiMemoryService = require('../services/aiMemoryService');

// Ask Echo: natural language conversational memory query
exports.askEcho = async (req, res, next) => {
  try {
    const { question, category, dateFilter } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    // Retrieve user's memories to synthesize context
    const query = req.user ? { user: req.user._id } : {};
    const allMemories = await Memory.find(query).sort({ createdAt: -1 }).limit(100);

    const result = await aiMemoryService.askEcho(question, allMemories, { category, dateFilter });

    res.json({
      success: true,
      data: {
        question,
        answer: result.answer,
        citedMemories: result.citedMemories,
        confidence: result.confidence,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Preview AI metadata enrichment before saving
exports.enrichText = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const enriched = await aiMemoryService.enrichTranscript(text);
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};
