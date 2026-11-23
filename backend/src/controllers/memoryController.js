const Memory = require('../models/Memory');
const Tag = require('../models/Tag');
const aiMemoryService = require('../services/aiMemoryService');

// Create a new memory
exports.createMemory = async (req, res, next) => {
  try {
    const { transcript, title, category, tags, audioUrl, audioDuration, locationContext } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ success: false, message: 'Memory transcript is required' });
    }

    // Run AI enrichment for entities, summary, sentiment, category, reminders
    const aiData = await aiMemoryService.enrichTranscript(transcript);

    const memory = new Memory({
      title: title && title.trim() ? title.trim() : aiData.title,
      transcript: transcript.trim(),
      originalTranscript: transcript.trim(), // Pristine voice transcript preserved
      summary: aiData.summary,
      mainPoints: aiData.mainPoints || [],
      datesAndDeadlines: aiData.datesAndDeadlines || [],
      category: category || aiData.category,
      tags: tags && tags.length > 0 ? tags : aiData.tags,
      entities: aiData.entities,
      sentiment: aiData.sentiment,
      reminders: aiData.reminders,
      actionItems: aiData.actionItems,
      importance: aiData.importance,
      audioUrl: audioUrl || null,
      audioDuration: audioDuration || 0,
      locationContext: locationContext || '',
      user: req.user ? req.user._id : null,
    });

    const saved = await memory.save();

    // Upsert tags into Tag collection
    if (saved.tags && saved.tags.length > 0) {
      for (const t of saved.tags) {
        await Tag.findOneAndUpdate(
          { name: t.toLowerCase() },
          { $inc: { usageCount: 1 }, $setOnInsert: { category: saved.category } },
          { upsert: true }
        ).catch(() => {});
      }
    }

    // Automatically identify actionable tasks and link to this memory
    try {
      const { extractTasksFromTranscript } = require('../utils/taskExtractor');
      const Task = require('../models/Task');
      const extractedTasks = extractTasksFromTranscript(saved.originalTranscript || saved.transcript, {
        memoryId: saved._id,
        category: saved.category,
      });
      for (const t of extractedTasks) {
        await Task.create(t);
      }
    } catch (e) {
      console.warn('Auto task extraction warning:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Memory saved successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// Get all memories with filtering, search, and pagination
exports.getMemories = async (req, res, next) => {
  try {
    const { search, category, tag, isPinned, sort = 'newest', page = 1, limit = 50 } = req.query;

    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (tag) {
      query.tags = tag.toLowerCase();
    }

    if (isPinned !== undefined) {
      query.isPinned = isPinned === 'true';
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { transcript: searchRegex },
        { summary: searchRegex },
        { tags: searchRegex },
        { 'entities.name': searchRegex },
      ];
    }

    let sortOptions = { isPinned: -1, createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'importance') {
      sortOptions = { importance: -1, createdAt: -1 };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Memory.countDocuments(query);
    const memories = await Memory.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: memories.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: memories,
    });
  } catch (error) {
    next(error);
  }
};

// Get single memory by ID
exports.getMemoryById = async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }
    res.json({ success: true, data: memory });
  } catch (error) {
    next(error);
  }
};

// Update an existing memory
exports.updateMemory = async (req, res, next) => {
  try {
    const existing = await Memory.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    const updateData = { ...req.body };

    // Preserve original transcript and never silently overwrite user's original words
    delete updateData.originalTranscript;

    // Track if user edited transcript or category
    if (updateData.transcript && updateData.transcript !== existing.transcript) {
      updateData.editedByUser = true;
      if (!updateData.summary || !updateData.mainPoints) {
        const aiData = await aiMemoryService.enrichTranscript(updateData.transcript);
        if (!updateData.summary) updateData.summary = aiData.summary;
        if (!updateData.mainPoints) updateData.mainPoints = aiData.mainPoints;
        if (!updateData.actionItems) updateData.actionItems = aiData.actionItems;
        if (!updateData.entities) updateData.entities = aiData.entities;
        if (!updateData.datesAndDeadlines) updateData.datesAndDeadlines = aiData.datesAndDeadlines;
      }
    }

    const memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Update tags if category changed
    if (memory.category && memory.tags) {
      for (const t of memory.tags) {
        Tag.findOneAndUpdate(
          { name: t.toLowerCase() },
          { $inc: { usageCount: 1 }, $setOnInsert: { category: memory.category } },
          { upsert: true }
        ).catch(() => {});
      }
    }

    res.json({ success: true, message: 'Memory updated successfully', data: memory });
  } catch (error) {
    next(error);
  }
};

// Delete memory
exports.deleteMemory = async (req, res, next) => {
  try {
    const memory = await Memory.findByIdAndDelete(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }
    res.json({ success: true, message: 'Memory deleted' });
  } catch (error) {
    next(error);
  }
};

// Toggle pin status
exports.togglePin = async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }
    memory.isPinned = !memory.isPinned;
    await memory.save();
    res.json({
      success: true,
      message: memory.isPinned ? 'Memory pinned' : 'Memory unpinned',
      data: memory,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle a reminder's completed state
exports.toggleReminder = async (req, res, next) => {
  try {
    const { id, reminderId } = req.params;
    const memory = await Memory.findById(id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }
    const reminder = memory.reminders.id(reminderId);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }
    reminder.isCompleted = !reminder.isCompleted;
    await memory.save();
    res.json({ success: true, data: memory });
  } catch (error) {
    next(error);
  }
};

// Semantic search endpoint using embeddings & vector similarity
exports.semanticSearch = async (req, res, next) => {
  try {
    const { query, category, dateFilter, limit = 15 } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const embeddingService = require('../services/embeddingService');
    const queryEmbedding = await embeddingService.generateEmbedding(query.trim());

    // Build filter query for MongoDB
    const filter = {};
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filter.createdAt = { $gte: oneWeekAgo };
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      filter.createdAt = { $gte: oneMonthAgo };
    }

    const memories = await Memory.find(filter).sort({ createdAt: -1 });

    const scored = await Promise.all(
      memories.map(async (mem) => {
        let memEmbedding = mem.embedding;
        if (!memEmbedding || memEmbedding.length === 0) {
          const textToEmbed = `${mem.title}. ${mem.summary}. ${mem.transcript}. ${mem.category}. ${(mem.tags || []).join(' ')}`;
          memEmbedding = await embeddingService.generateEmbedding(textToEmbed);
        }
        const similarity = embeddingService.cosineSimilarity(queryEmbedding, memEmbedding);
        return {
          ...mem.toObject(),
          relevanceScore: Math.round(similarity * 100),
          similarity,
        };
      })
    );

    scored.sort((a, b) => b.similarity - a.similarity);

    const results = scored.slice(0, Number(limit) || 15);

    res.json({
      success: true,
      count: results.length,
      data: results,
      query: query.trim(),
    });
  } catch (error) {
    next(error);
  }
};
