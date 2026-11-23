const express = require('express');
const router = express.Router();
const { upload, verifyAudioSignature } = require('../middleware/upload');
const audioController = require('../controllers/audioController');
const { optionalAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { validateObjectId } = require('../middleware/validator');

router.post(
  '/upload',
  optionalAuth,
  uploadLimiter,
  upload.single('audio'),
  verifyAudioSignature,
  audioController.uploadAudio
);

router.post(
  '/retry-transcription/:id',
  optionalAuth,
  validateObjectId('id'),
  audioController.retryTranscription
);

router.put(
  '/transcript/:id',
  optionalAuth,
  validateObjectId('id'),
  audioController.updateTranscript
);

module.exports = router;
