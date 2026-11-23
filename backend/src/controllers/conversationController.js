const Conversation = require('../models/Conversation');
const Memory = require('../models/Memory');
const aiMemoryService = require('../services/aiMemoryService');

// Get all conversations (organized list)
exports.listConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .select('title messages lastMessageSnippet lastMessageAt createdAt updatedAt');

    const formatted = conversations.map((c) => ({
      _id: c._id,
      title: c.title,
      messageCount: c.messages.length,
      lastMessageSnippet:
        c.lastMessageSnippet ||
        (c.messages.length > 0 ? c.messages[c.messages.length - 1].text : 'No messages yet'),
      lastMessageAt: c.lastMessageAt || c.updatedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// Get single conversation with full message thread
exports.getConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new conversation session
exports.createConversation = async (req, res, next) => {
  try {
    const { title, initialMessage } = req.body;

    const conversation = new Conversation({
      title: title && title.trim() ? title.trim() : 'New Conversation',
      messages: [],
    });

    if (initialMessage && initialMessage.trim()) {
      conversation.messages.push({
        sender: 'user',
        text: initialMessage.trim(),
        timestamp: new Date(),
      });
      conversation.lastMessageSnippet = initialMessage.trim();
    }

    await conversation.save();

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

// Send a message in a conversation: runs grounded RAG and appends response
exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, category, dateFilter } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    let conversation;
    if (id === 'new' || !id) {
      conversation = new Conversation({
        title: text.trim().slice(0, 45) + (text.length > 45 ? '...' : ''),
        messages: [],
      });
    } else {
      conversation = await Conversation.findById(id);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }
    }

    // 1. Add User Message
    const userMsg = {
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };
    conversation.messages.push(userMsg);

    // 2. Retrieve memories and execute Grounded RAG
    const allMemories = await Memory.find().sort({ createdAt: -1 }).limit(100);
    const aiResult = await aiMemoryService.askEcho(text.trim(), allMemories, { category, dateFilter });

    // 3. Add Echo Assistant Message
    const echoMsg = {
      sender: 'echo',
      text: aiResult.answer,
      citedMemories: aiResult.citedMemories || [],
      confidence: aiResult.confidence || 0,
      timestamp: new Date(),
    };
    conversation.messages.push(echoMsg);

    // Update conversation title if still default
    if (conversation.title === 'New Conversation' || conversation.messages.length <= 2) {
      conversation.title = text.trim().slice(0, 40) + (text.length > 40 ? '...' : '');
    }

    conversation.lastMessageSnippet = echoMsg.text.slice(0, 80);
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.json({
      success: true,
      data: {
        conversation,
        userMessage: userMsg,
        echoMessage: echoMsg,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a single conversation
exports.deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// Clear all conversations
exports.clearAllConversations = async (req, res, next) => {
  try {
    await Conversation.deleteMany({});
    res.json({
      success: true,
      message: 'All conversations cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};
