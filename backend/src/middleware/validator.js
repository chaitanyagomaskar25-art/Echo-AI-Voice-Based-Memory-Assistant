const mongoose = require('mongoose');

/**
 * Validation Error Helper
 */
const sendValidationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request payload validation failed',
      details: errors,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Validate MongoDB ObjectId in req.params
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID_FORMAT',
          message: `The parameter "${paramName}" with value "${id}" is not a valid MongoDB ObjectId.`,
        },
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
};

/**
 * Validate User Registration
 */
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Full name is required' });
  } else if (name.trim().length > 60) {
    errors.push({ field: 'name', message: 'Name cannot exceed 60 characters' });
  }

  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};

/**
 * Validate User Login
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push({ field: 'email', message: 'Email address is required' });
  }
  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};

/**
 * Validate Memory Creation / Update
 */
const validateMemoryPayload = (req, res, next) => {
  const { transcript, category, importance } = req.body;
  const errors = [];

  if (req.method === 'POST') {
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      errors.push({ field: 'transcript', message: 'Transcript text is required' });
    }
  }

  const validCategories = [
    'Personal',
    'Work',
    'Ideas',
    'Whereabouts',
    'People',
    'Health',
    'Tasks',
    'Study',
  ];
  if (category && !validCategories.includes(category)) {
    errors.push({
      field: 'category',
      message: `Invalid category "${category}". Allowed: ${validCategories.join(', ')}`,
    });
  }

  if (importance !== undefined) {
    const num = Number(importance);
    if (isNaN(num) || num < 1 || num > 5) {
      errors.push({ field: 'importance', message: 'Importance must be an integer between 1 and 5' });
    }
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};

/**
 * Validate Task Creation
 */
const validateTaskPayload = (req, res, next) => {
  const { title, priority, status } = req.body;
  const errors = [];

  if (req.method === 'POST') {
    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.push({ field: 'title', message: 'Task title is required' });
    }
  }

  if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
    errors.push({ field: 'priority', message: 'Priority must be one of: low, medium, high, urgent' });
  }

  if (status && !['pending', 'upcoming', 'overdue', 'completed', 'cancelled'].includes(status)) {
    errors.push({ field: 'status', message: 'Status must be one of: pending, upcoming, overdue, completed, cancelled' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};

/**
 * Validate Reminder Creation
 */
const validateReminderPayload = (req, res, next) => {
  const { title, remindAt } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push({ field: 'title', message: 'Reminder title is required' });
  }

  if (!remindAt || isNaN(new Date(remindAt).getTime())) {
    errors.push({ field: 'remindAt', message: 'A valid remindAt date-time string is required' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};

/**
 * Validate Conversation Message
 */
const validateConversationMessage = (req, res, next) => {
  const { text } = req.body;
  const errors = [];

  if (!text || typeof text !== 'string' || !text.trim()) {
    errors.push({ field: 'text', message: 'Message text cannot be empty' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};

module.exports = {
  validateObjectId,
  validateRegister,
  validateLogin,
  validateMemoryPayload,
  validateTaskPayload,
  validateReminderPayload,
  validateConversationMessage,
};
