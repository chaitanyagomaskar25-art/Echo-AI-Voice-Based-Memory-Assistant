const mongoose = require('mongoose');
const Memory = require('../src/models/Memory');
const embeddingService = require('../src/services/embeddingService');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function seedYesterday() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/echo_memory_db');

  const title = 'Audio Waveform & Whisper API Integration';
  const existing = await Memory.findOne({ title });
  if (existing) {
    console.log('Already exists');
    await mongoose.disconnect();
    return;
  }

  // Exactly 1 day ago (yesterday)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const textToEmbed = `${title}. Real-time audio waveform visualization and Whisper transcription integration. Work. engineering audio whisper`;
  const embedding = await embeddingService.generateEmbedding(textToEmbed);

  await Memory.create({
    title,
    category: 'Work',
    originalTranscript: 'Yesterday I worked on the core audio recording module: implemented real-time audio waveform visualization, connected the OpenAI Whisper transcription pipeline on the backend, and resolved the audio buffer sync in React Native.',
    transcript: 'Yesterday I worked on the core audio recording module: implemented real-time audio waveform visualization, connected the OpenAI Whisper transcription pipeline on the backend, and resolved the audio buffer sync in React Native.',
    summary: 'Engineered real-time audio waveform visualizer and connected backend Whisper speech-to-text API; resolved mobile audio buffer sync.',
    mainPoints: [
      'Engineered live audio waveform visualization component',
      'Configured Whisper transcription endpoint in Express',
      'Fixed audio buffer synchronization for Expo Audio'
    ],
    actionItems: [
      'Benchmark Whisper transcription response latency',
      'Deploy mobile recording screen testing build'
    ],
    tags: ['whisper', 'audio', 'waveform', 'transcription', 'work', 'engineering'],
    entities: [
      { name: 'Whisper', type: 'project' },
      { name: 'Expo Audio', type: 'project' }
    ],
    embedding,
    createdAt: yesterday,
    updatedAt: yesterday,
  });

  console.log('Yesterday work memory successfully created!');
  await mongoose.disconnect();
}

seedYesterday().catch(console.error);
