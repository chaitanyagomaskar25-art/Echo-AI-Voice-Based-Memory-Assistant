const mongoose = require('mongoose');
const Memory = require('../src/models/Memory');
const embeddingService = require('../src/services/embeddingService');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const sampleMemories = [
  {
    title: 'Architecture Decision for Echo Project',
    category: 'Work',
    originalTranscript: 'In our meeting last week on Friday, I decided that we are going with React Native with Expo for the mobile app and Node.js with MongoDB for the backend. We also decided to use vector embeddings for semantic search rather than plain keyword search.',
    transcript: 'In our meeting last week on Friday, I decided that we are going with React Native with Expo for the mobile app and Node.js with MongoDB for the backend. We also decided to use vector embeddings for semantic search rather than plain keyword search.',
    summary: 'Decided on React Native Expo frontend, Node.js + Express backend, MongoDB database, and vector embeddings for semantic search.',
    mainPoints: [
      'Adopt React Native with Expo for cross-platform speed',
      'Use MongoDB with vector embeddings for semantic RAG',
      'Deploy Express backend with Whisper transcription'
    ],
    actionItems: ['Configure Expo SecureStore', 'Set up MongoDB vector index'],
    tags: ['decision', 'architecture', 'expo', 'mongodb'],
    entities: [
      { name: 'React Native', type: 'project' },
      { name: 'MongoDB', type: 'project' },
      { name: 'Last week Friday', type: 'date' }
    ],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago (last week)
  },
  {
    title: 'AI Voice Memory Assistant Concept',
    category: 'Ideas',
    originalTranscript: 'Here is the project idea I discussed: Echo, an ambient AI voice-based memory assistant that lets users talk naturally, automatically transcribes voice notes, extracts action items, dates and entities, and enables instant semantic recall.',
    transcript: 'Here is the project idea I discussed: Echo, an ambient AI voice-based memory assistant that lets users talk naturally, automatically transcribes voice notes, extracts action items, dates and entities, and enables instant semantic recall.',
    summary: 'Conceptualized Echo: ambient voice memory assistant with automatic transcription, entity extraction, and intelligent semantic retrieval.',
    mainPoints: [
      'Voice-first user experience with waveform visualization',
      'Automatic entity and deadline extraction',
      'Conversational memory search powered by embeddings'
    ],
    actionItems: ['Build prototype recording screen', 'Implement audio waveform renderer'],
    tags: ['project idea', 'ai', 'echo', 'voice', 'assistant'],
    entities: [
      { name: 'Echo', type: 'project' },
      { name: 'Voice Memory', type: 'concept' }
    ],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Cloud Certification Exam Preparation',
    category: 'Study',
    originalTranscript: 'I need to begin my exam preparation for the AWS Certified Solutions Architect exam next Tuesday. I will study 2 hours every evening, focusing on distributed systems, DynamoDB, VPC networking, and serverless architectures.',
    transcript: 'I need to begin my exam preparation for the AWS Certified Solutions Architect exam next Tuesday. I will study 2 hours every evening, focusing on distributed systems, DynamoDB, VPC networking, and serverless architectures.',
    summary: 'Plan for AWS exam preparation: 2 hours daily studying distributed systems, DynamoDB, and VPC networking for the exam next Tuesday.',
    mainPoints: [
      'Exam scheduled for next Tuesday',
      'Daily 2-hour study routine focused on AWS services',
      'Review VPC peering, DynamoDB streams, and Lambda'
    ],
    datesAndDeadlines: [
      { dateText: 'next Tuesday', context: 'AWS Solutions Architect Exam' }
    ],
    actionItems: ['Complete DynamoDB practice test', 'Review VPC networking flashcards'],
    tags: ['exam', 'study', 'aws', 'certification'],
    entities: [
      { name: 'AWS', type: 'project' },
      { name: 'next Tuesday', type: 'date' }
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Client Deliverable Commitments & Tasks',
    category: 'Tasks',
    originalTranscript: 'Tasks I promised to complete before the sprint review: finalize the vector search embedding integration, optimize the audio recording pipeline with pause/resume, and test the offline cosine fallback.',
    transcript: 'Tasks I promised to complete before the sprint review: finalize the vector search embedding integration, optimize the audio recording pipeline with pause/resume, and test the offline cosine fallback.',
    summary: 'Promised commitments: finalize vector search embeddings, optimize audio recording pipeline, and test offline cosine fallback before sprint review.',
    mainPoints: [
      'Finalize vector search embedding integration',
      'Polish audio recording pipeline with pause/resume',
      'Verify offline fallback vector projection'
    ],
    actionItems: [
      'Vector search embedding integration',
      'Audio recording pipeline optimization',
      'Offline cosine fallback verification'
    ],
    tags: ['tasks', 'commitments', 'sprint', 'vector search'],
    entities: [
      { name: 'Vector Search', type: 'project' },
      { name: 'Sprint Review', type: 'concept' }
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Voice AI SaaS Business Idea & Monetization',
    category: 'Ideas',
    originalTranscript: 'Had a long discussion about the SaaS business idea for Echo: offering a freemium model with 100 minutes of free monthly transcription, and a pro tier at 12 dollars per month with unlimited vector search, deep semantic memory synthesis, and export to Notion.',
    transcript: 'Had a long discussion about the SaaS business idea for Echo: offering a freemium model with 100 minutes of free monthly transcription, and a pro tier at 12 dollars per month with unlimited vector search, deep semantic memory synthesis, and export to Notion.',
    summary: 'Discussed SaaS business idea: Freemium with 100 mins transcription, $12/month Pro tier for unlimited vector search and Notion integration.',
    mainPoints: [
      'Freemium tier: 100 minutes of monthly transcription',
      'Pro tier: $12/month for unlimited vector search and deep semantic memory synthesis',
      'Integration partnerships with Notion and Obsidian'
    ],
    actionItems: ['Draft pricing page mockups', 'Validate willingness to pay with 10 beta testers'],
    tags: ['business idea', 'monetization', 'saas', 'freemium', 'pricing'],
    entities: [
      { name: 'Notion', type: 'project' },
      { name: 'Obsidian', type: 'project' }
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/echo_memory_db';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  for (const item of sampleMemories) {
    const textToEmbed = `${item.title}. ${item.summary}. ${item.transcript}. ${item.category}. ${(item.tags || []).join(' ')}`;
    const embedding = await embeddingService.generateEmbedding(textToEmbed);

    const existing = await Memory.findOne({ title: item.title });
    if (existing) {
      existing.embedding = embedding;
      existing.originalTranscript = item.originalTranscript;
      existing.mainPoints = item.mainPoints;
      existing.actionItems = item.actionItems;
      existing.createdAt = item.createdAt;
      await existing.save();
      console.log(`Updated memory with embedding: "${item.title}"`);
    } else {
      await Memory.create({
        ...item,
        embedding,
      });
      console.log(`Created memory with embedding: "${item.title}"`);
    }
  }

  // Also backfill any other memories in the database missing embeddings
  const others = await Memory.find({ $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }] });
  console.log(`Backfilling ${others.length} other memories...`);
  for (const m of others) {
    const textToEmbed = `${m.title}. ${m.summary || m.transcript}. ${m.category}. ${(m.tags || []).join(' ')}`;
    m.embedding = await embeddingService.generateEmbedding(textToEmbed);
    if (!m.originalTranscript) m.originalTranscript = m.transcript;
    await m.save();
  }

  console.log('Seeding and embedding backfill complete!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
