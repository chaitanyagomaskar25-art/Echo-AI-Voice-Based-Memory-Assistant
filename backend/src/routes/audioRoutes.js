const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const audioController = require('../controllers/audioController');
const { optionalAuth } = require('../middleware/auth');

router.post('/upload', optionalAuth, upload.single('audio'), audioController.uploadAudio);
router.post('/retry-transcription/:id', optionalAuth, audioController.retryTranscription);
router.put('/transcript/:id', optionalAuth, audioController.updateTranscript);

module.exports = router;
