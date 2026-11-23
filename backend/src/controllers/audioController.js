const fs = require('fs');
const path = require('path');
const speechService = require('../services/speechService');
const aiMemoryService = require('../services/aiMemoryService');
const Memory = require('../models/Memory');
const Tag = require('../models/Tag');

// @desc    Upload recorded audio file, transcribe via Whisper STT & persist to MongoDB
// @route   POST /api/audio/upload
// @access  Public / Authenticated
exports.uploadAudio = async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided in request.',
      });
    }

    const {
      transcriptOverride,
      titleOverride,
      categoryOverride,
      language = 'en',
      duration,
      saveImmediately = 'true',
    } = req.body;

    const audioUrl = `/uploads/${file.filename}`;
    const audioDuration = duration ? parseFloat(duration) : 0;

    let transcriptionResult;
    let transcriptionStatus = 'completed';
    let transcriptionError = null;

    // 1. Transcribe audio with real Speech-to-Text service (Whisper API)
    try {
      transcriptionResult = await speechService.transcribeAudio(file, {
        language,
        fallbackText: transcriptOverride,
      });
    } catch (err) {
      console.error('[AudioController] Speech-to-text transcription error:', err.message);
      transcriptionStatus = 'failed';
      transcriptionError = err.message;
      transcriptionResult = {
        success: false,
        text: transcriptOverride || 'Transcription could not be completed. Tap retry to attempt again.',
        language,
        provider: 'failed',
      };
    }

    // 2. AI Semantic Enrichment (only if transcription succeeded)
    let enriched = {
      title: titleOverride || 'Voice Memory',
      summary: '',
      category: categoryOverride || 'Ideas',
      tags: ['voice'],
      entities: [],
      sentiment: 'neutral',
      importance: 3,
      reminders: [],
      actionItems: [],
    };

    if (transcriptionStatus === 'completed' && transcriptionResult.text) {
      try {
        enriched = await aiMemoryService.enrichTranscript(transcriptionResult.text);
      } catch (e) {
        console.warn('[AudioController] AI enrichment fallback notice:', e.message);
      }
    }

    // 3. Persist memory in MongoDB
    let savedMemory = null;

    if (saveImmediately === 'true' || saveImmediately === true) {
      const finalTitle = (titleOverride && titleOverride.trim()) || enriched.title || 'Voice Memory';
      const finalCategory = (categoryOverride && categoryOverride.trim()) || enriched.category || 'Personal';

      savedMemory = await Memory.create({
        title: finalTitle,
        transcript: transcriptionResult.text,
        originalTranscript: transcriptionResult.text,
        summary: enriched.summary,
        mainPoints: enriched.mainPoints || [],
        datesAndDeadlines: enriched.datesAndDeadlines || [],
        category: finalCategory,
        tags: enriched.tags && enriched.tags.length > 0 ? enriched.tags : ['voice', finalCategory.toLowerCase()],
        entities: enriched.entities || [],
        sentiment: enriched.sentiment || 'neutral',
        audioUrl,
        audioDuration,
        importance: enriched.importance || 3,
        reminders: enriched.reminders || [],
        actionItems: enriched.actionItems || [],
        transcriptionStatus,
        transcriptionError,
        language: transcriptionResult.language || language,
        transcriptionProvider: transcriptionResult.provider || 'whisper',
        user: req.user ? req.user._id : null,
      });

      // Update Tag statistics
      if (savedMemory.tags && savedMemory.tags.length > 0) {
        for (const tag of savedMemory.tags) {
          Tag.findOneAndUpdate(
            { name: tag.toLowerCase() },
            { $inc: { usageCount: 1 }, $setOnInsert: { category: finalCategory } },
            { upsert: true }
          ).catch(() => {});
        }
      }
    }

    res.status(201).json({
      success: transcriptionStatus === 'completed',
      message: transcriptionStatus === 'completed'
        ? 'Audio transcribed and indexed successfully.'
        : 'Audio uploaded, but speech-to-text failed. You can retry transcription.',
      data: {
        audioUrl,
        audioDuration,
        transcript: transcriptionResult.text,
        language: transcriptionResult.language || language,
        provider: transcriptionResult.provider,
        transcriptionStatus,
        transcriptionError,
        enriched,
        memory: savedMemory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Retry speech transcription on an existing recorded audio memo
// @route   POST /api/audio/retry-transcription/:id
// @access  Public / Authenticated
exports.retryTranscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language = 'en' } = req.body;

    const memory = await Memory.findById(id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found.' });
    }

    if (!memory.audioUrl) {
      return res.status(400).json({ success: false, message: 'No audio recording associated with this memory.' });
    }

    const audioFilename = path.basename(memory.audioUrl);
    const audioPath = path.join(__dirname, '../../uploads', audioFilename);

    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ success: false, message: 'Audio file not found on server.' });
    }

    // Set status to processing
    memory.transcriptionStatus = 'processing';
    await memory.save();

    // Call SpeechService Whisper
    const fakeFile = { path: audioPath, filename: audioFilename };
    const transcriptionResult = await speechService.transcribeAudio(fakeFile, { language });

    // AI Semantic re-enrichment
    const enriched = await aiMemoryService.enrichTranscript(transcriptionResult.text);

    memory.transcript = transcriptionResult.text;
    memory.summary = enriched.summary;
    memory.transcriptionStatus = 'completed';
    memory.transcriptionError = null;
    memory.language = transcriptionResult.language || language;
    memory.transcriptionProvider = transcriptionResult.provider;
    memory.entities = enriched.entities || memory.entities;
    memory.actionItems = enriched.actionItems || memory.actionItems;
    memory.reminders = enriched.reminders || memory.reminders;
    if (enriched.tags && enriched.tags.length > 0) {
      memory.tags = enriched.tags;
    }

    await memory.save();

    res.status(200).json({
      success: true,
      message: 'Transcription successfully retried and updated.',
      data: memory,
    });
  } catch (error) {
    // If retry failed, mark status as failed
    if (req.params.id) {
      await Memory.findByIdAndUpdate(req.params.id, {
        transcriptionStatus: 'failed',
        transcriptionError: error.message,
      }).catch(() => {});
    }
    next(error);
  }
};

// @desc    Update and re-index an edited transcript for a memory
// @route   PUT /api/audio/transcript/:id
// @access  Public / Authenticated
exports.updateTranscript = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transcript, title, category } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ success: false, message: 'Transcript cannot be empty.' });
    }

    const memory = await Memory.findById(id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found.' });
    }

    // Re-enrich with AI
    const enriched = await aiMemoryService.enrichTranscript(transcript.trim());

    memory.transcript = transcript.trim();
    memory.editedByUser = true;
    memory.summary = enriched.summary;
    memory.mainPoints = enriched.mainPoints || [];
    memory.datesAndDeadlines = enriched.datesAndDeadlines || [];
    if (title && title.trim()) memory.title = title.trim();
    if (category && category.trim()) memory.category = category.trim();
    memory.entities = enriched.entities || memory.entities;
    memory.actionItems = enriched.actionItems || memory.actionItems;
    memory.reminders = enriched.reminders || memory.reminders;
    memory.sentiment = enriched.sentiment || memory.sentiment;
    memory.transcriptionStatus = 'completed';

    await memory.save();

    res.status(200).json({
      success: true,
      message: 'Transcript updated and AI memory re-indexed.',
      data: memory,
    });
  } catch (error) {
    next(error);
  }
};
