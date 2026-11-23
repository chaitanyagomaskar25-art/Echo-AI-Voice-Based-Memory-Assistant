const Memory = require('../models/Memory');
const Tag = require('../models/Tag');
const aiMemoryService = require('../services/aiMemoryService');

// Create a new memory
exports.createMemory = async (req, res, next) => {
  try {
    const {
      transcript,
      title,
      category,
      tags,
      audioUrl,
      audioDuration,
      locationContext,
      clientLocalId,
      idempotencyKey,
    } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ success: false, message: 'Memory transcript is required' });
    }

    const offlineKey = clientLocalId || idempotencyKey;

    // Deduplication check: Avoid duplicate memories when syncing offline records
    if (offlineKey) {
      const existing = await Memory.findOne({ clientLocalId: offlineKey });
      if (existing) {
        return res.status(200).json({
          success: true,
          deduplicated: true,
          message: 'Memory already synced from offline storage.',
          data: existing,
        });
      }
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
      clientLocalId: offlineKey || null,
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
    const {
      search,
      category,
      tag,
      isPinned,
      isFavorite,
      isArchived,
      dateFilter,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    // User authentication scoping: strictly isolate user data
    if (req.user) {
      query.user = req.user._id;
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Tag filter
    if (tag) {
      query.tags = tag.toLowerCase();
    }

    // Pin filter
    if (isPinned !== undefined) {
      query.isPinned = isPinned === 'true';
    }

    // Favorite filter
    if (isFavorite !== undefined) {
      query.isFavorite = isFavorite === 'true';
    }

    // Archive filter: default to non-archived unless requested
    if (isArchived === 'true') {
      query.isArchived = true;
    } else if (isArchived === 'all') {
      // no filter on isArchived
    } else {
      query.isArchived = { $ne: true };
    }

    // Date range filter
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: startOfDay };
      } else if (dateFilter === 'week') {
        const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: pastWeek };
      } else if (dateFilter === 'month') {
        const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: pastMonth };
      } else if (dateFilter === 'year') {
        const pastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: pastYear };
      }
    }

    // Text search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { title: searchRegex },
        { transcript: searchRegex },
        { summary: searchRegex },
        { tags: searchRegex },
        { 'entities.name': searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Sorting
    let sortOptions = { isPinned: -1, createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'importance') {
      sortOptions = { importance: -1, createdAt: -1 };
    } else if (sort === 'title') {
      sortOptions = { title: 1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await Memory.countDocuments(query);
    const memories = await Memory.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      count: memories.length,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasMore: pageNum < totalPages,
      data: memories,
    });
  } catch (error) {
    next(error);
  }
};

// Get single memory by ID with related tasks
exports.getMemoryById = async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    if (req.user && memory.user && String(memory.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this memory' });
    }

    // Fetch related tasks for this memory
    const Task = require('../models/Task');
    const taskQuery = { memory: memory._id };
    if (req.user) {
      taskQuery.user = req.user._id;
    }
    const relatedTasks = await Task.find(taskQuery).sort({ dueDate: 1, createdAt: -1 });

    const memoryObj = memory.toObject();
    memoryObj.relatedTasks = relatedTasks;

    res.json({ success: true, data: memoryObj });
  } catch (error) {
    next(error);
  }
};

// Get tasks related to a memory
exports.getMemoryTasks = async (req, res, next) => {
  try {
    const Task = require('../models/Task');
    const tasks = await Task.find({ memory: req.params.id }).sort({ dueDate: 1, createdAt: -1 });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

// Update an existing memory (titles, summaries, transcripts, tags, category, favorites, etc.)
exports.updateMemory = async (req, res, next) => {
  try {
    const existing = await Memory.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    // Authentication scoping check
    if (req.user && existing.user && String(existing.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this memory' });
    }

    const updateData = { ...req.body };

    // Preserve original transcript and never silently overwrite user's original words
    delete updateData.originalTranscript;

    // Track if user edited transcript
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

    // Clean tags if provided
    if (Array.isArray(updateData.tags)) {
      updateData.tags = updateData.tags
        .map((t) => String(t).trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
        .filter(Boolean);
    }

    const memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Update tags in Tag collection
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
    const existing = await Memory.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    if (req.user && existing.user && String(existing.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this memory' });
    }

    await Memory.findByIdAndDelete(req.params.id);

    // Unlink any tasks that were referencing this memory
    try {
      const Task = require('../models/Task');
      await Task.updateMany({ memory: req.params.id }, { $set: { memory: null } });
    } catch (e) {
      console.warn('Unlink tasks error:', e.message);
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
    if (req.user && memory.user && String(memory.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this memory' });
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

// Toggle favorite status
exports.toggleFavorite = async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }
    if (req.user && memory.user && String(memory.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this memory' });
    }
    memory.isFavorite = !memory.isFavorite;
    await memory.save();
    res.json({
      success: true,
      message: memory.isFavorite ? 'Memory added to favorites' : 'Memory removed from favorites',
      data: memory,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle archive status
exports.toggleArchive = async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }
    if (req.user && memory.user && String(memory.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this memory' });
    }
    memory.isArchived = !memory.isArchived;
    await memory.save();
    res.json({
      success: true,
      message: memory.isArchived ? 'Memory archived' : 'Memory restored from archive',
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
    if (req.user && memory.user && String(memory.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this memory' });
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

    // Build filter query for MongoDB with strict user scoping
    const filter = {};
    if (req.user) {
      filter.user = req.user._id;
    }
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
