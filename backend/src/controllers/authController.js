const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Memory = require('../models/Memory');
const Task = require('../models/Task');
const Reminder = require('../models/Reminder');
const NotificationPreference = require('../models/NotificationPreference');
const Conversation = require('../models/Conversation');
const Recap = require('../models/Recap');

/**
 * Generate signed JWT Token for authenticated user
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'echo_voice_memory_jwt_secret_key_2026_super_secure',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Create user in MongoDB
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      profileSetupCompleted: false,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        voiceTonePreference: user.voiceTonePreference,
        profileSetupCompleted: user.profileSetupCompleted,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login existing user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Find user and explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No account found with this email.',
      });
    }

    // Verify password with bcrypt
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        voiceTonePreference: user.voiceTonePreference,
        profileSetupCompleted: user.profileSetupCompleted,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private (Protected by JWT)
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        voiceTonePreference: user.voiceTonePreference,
        profileSetupCompleted: user.profileSetupCompleted,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details & preferences
// @route   PUT /api/auth/profile
// @access  Private (Protected by JWT)
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, bio, voiceTonePreference, profileSetupCompleted } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name.trim();
    if (avatar) fieldsToUpdate.avatar = avatar;
    if (bio !== undefined) fieldsToUpdate.bio = bio;
    if (voiceTonePreference) fieldsToUpdate.voiceTonePreference = voiceTonePreference;
    if (profileSetupCompleted !== undefined) fieldsToUpdate.profileSetupCompleted = profileSetupCompleted;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        voiceTonePreference: user.voiceTonePreference,
        profileSetupCompleted: user.profileSetupCompleted,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset code
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the account email address.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account with that email address exists.',
      });
    }

    // Generate a 6-digit numeric verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Expire in 15 minutes
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Password reset code generated and sent.',
      resetCode, // Returned for testing / mobile display
      email: user.email,
      expiresIn: '15 minutes',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using verification code
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    // Find user with valid non-expired reset code
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordCode: resetCode.trim(),
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordCode +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new one.',
      });
    }

    // Set new password (pre-save hook will hash it with bcrypt)
    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You are now logged in.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        voiceTonePreference: user.voiceTonePreference,
        profileSetupCompleted: user.profileSetupCompleted,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete user account and all personal voice memories (GDPR compliance)
// @route   DELETE /api/auth/account
// @access  Protected
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Delete physical audio files from uploads directory
    const userMemories = await Memory.find({ user: userId });
    let deletedFilesCount = 0;
    for (const mem of userMemories) {
      if (mem.audioUrl) {
        const filePath = path.join(__dirname, '../../', mem.audioUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            deletedFilesCount++;
          } catch (e) {
            console.warn(`[DeleteAccount] Could not unlink ${filePath}:`, e.message);
          }
        }
      }
    }

    // 2. Cascade delete all user documents
    const [memoriesRes, tasksRes, remindersRes, prefsRes, convsRes, recapsRes] = await Promise.all([
      Memory.deleteMany({ user: userId }),
      Task.deleteMany({ user: userId }),
      Reminder.deleteMany({ user: userId }),
      NotificationPreference.deleteMany({ user: userId }),
      Conversation.deleteMany({ user: userId }),
      Recap.deleteMany({ user: userId }),
    ]);

    // 3. Delete user document
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Account and all associated voice memories, tasks, and data permanently deleted.',
      details: {
        deletedFilesCount,
        deletedMemoriesCount: memoriesRes.deletedCount,
        deletedTasksCount: tasksRes.deletedCount,
        deletedRemindersCount: remindersRes.deletedCount,
        deletedConversationsCount: convsRes.deletedCount,
        deletedRecapsCount: recapsRes.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all user memories, tasks and history while keeping user account active
// @route   DELETE /api/auth/data
// @access  Protected
exports.clearUserData = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Delete audio files on disk
    const userMemories = await Memory.find({ user: userId });
    for (const mem of userMemories) {
      if (mem.audioUrl) {
        const filePath = path.join(__dirname, '../../', mem.audioUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      }
    }

    // Cascade clear documents
    await Promise.all([
      Memory.deleteMany({ user: userId }),
      Task.deleteMany({ user: userId }),
      Reminder.deleteMany({ user: userId }),
      Conversation.deleteMany({ user: userId }),
      Recap.deleteMany({ user: userId }),
    ]);

    res.status(200).json({
      success: true,
      message: 'All personal voice memories, tasks, reminders, and conversations have been reset.',
    });
  } catch (error) {
    next(error);
  }
};
