const Memory = require('../models/Memory');
const Tag = require('../models/Tag');

const seedMemories = [
  {
    title: 'Passport and Spare Car Keys Location',
    transcript: 'I placed my international passport and spare Honda car keys inside the top blue drawer of the study desk next to the bookshelf.',
    summary: 'Passport and spare Honda keys are stored in the top blue drawer in the study desk.',
    category: 'Whereabouts',
    tags: ['passport', 'keys', 'study', 'car', 'drawer'],
    entities: [
      { name: 'study desk', type: 'location' },
      { name: 'top blue drawer', type: 'location' },
      { name: 'passport', type: 'object' },
      { name: 'Honda keys', type: 'object' },
    ],
    sentiment: 'neutral',
    isPinned: true,
    importance: 5,
    reminders: [],
    actionItems: [],
  },
  {
    title: 'Project Falcon Sprint Deliverable',
    transcript: 'Team meeting with Sarah and Marcus regarding Project Falcon. Need to submit the secure authentication flow and API documentation by next Tuesday.',
    summary: 'Project Falcon deadline for auth flow and API docs is next Tuesday. Sync with Sarah and Marcus.',
    category: 'Work',
    tags: ['work', 'falcon', 'sprint', 'deadline', 'urgent'],
    entities: [
      { name: 'Sarah', type: 'person' },
      { name: 'Marcus', type: 'person' },
      { name: 'Project Falcon', type: 'concept' },
      { name: 'next Tuesday', type: 'date' },
    ],
    sentiment: 'urgent',
    isPinned: true,
    importance: 5,
    reminders: [
      {
        title: 'Submit Project Falcon authentication flow',
        remindAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isCompleted: false,
      },
    ],
    actionItems: ['Submit authentication flow', 'Complete API documentation'],
  },
  {
    title: 'Dr. Emily Watson Annual Checkup',
    transcript: 'Met with Dr. Emily Watson at Metro Health Clinic. Blood pressure was normal. Prescribed Vitamin D3 supplements to be taken once daily in the morning.',
    summary: 'Annual checkup with Dr. Emily Watson. Normal BP, take Vitamin D3 daily each morning.',
    category: 'Health',
    tags: ['health', 'doctor', 'vitamins', 'prescription'],
    entities: [
      { name: 'Dr. Emily Watson', type: 'person' },
      { name: 'Metro Health Clinic', type: 'location' },
      { name: 'Vitamin D3', type: 'object' },
    ],
    sentiment: 'positive',
    isPinned: false,
    importance: 4,
    reminders: [
      {
        title: 'Take morning Vitamin D3 supplement',
        remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isCompleted: false,
      },
    ],
    actionItems: ['Take Vitamin D3 daily morning'],
  },
  {
    title: 'Parking Location at Downtown Mall',
    transcript: 'Parked the car in Level B2, Section 4 near Blue Pillar 14 right by the express elevator.',
    summary: 'Car parked on Level B2 Section 4 near Blue Pillar 14 by the express elevator.',
    category: 'Whereabouts',
    tags: ['parking', 'car', 'mall', 'location'],
    entities: [
      { name: 'Level B2 Section 4', type: 'location' },
      { name: 'Blue Pillar 14', type: 'location' },
      { name: 'car', type: 'object' },
    ],
    sentiment: 'neutral',
    isPinned: false,
    importance: 4,
    reminders: [],
    actionItems: [],
  },
  {
    title: 'Book Recommendation from Alex',
    transcript: 'Alex recommended reading "Thinking Fast and Slow" by Daniel Kahneman and "Atomic Habits" for cognitive workflow improvement.',
    summary: 'Recommended reading from Alex: Thinking Fast and Slow and Atomic Habits.',
    category: 'People',
    tags: ['books', 'alex', 'reading', 'habits'],
    entities: [
      { name: 'Alex', type: 'person' },
      { name: 'Thinking Fast and Slow', type: 'concept' },
      { name: 'Atomic Habits', type: 'concept' },
    ],
    sentiment: 'positive',
    isPinned: false,
    importance: 3,
    reminders: [],
    actionItems: ['Check out Thinking Fast and Slow', 'Read Atomic Habits'],
  },
  {
    title: 'Weekend Grocery Checklist',
    transcript: 'Don\'t forget to buy organic oat milk, espresso beans, fresh sourdough bread, and avocados for Sunday brunch.',
    summary: 'Sunday brunch groceries: oat milk, espresso beans, sourdough bread, avocados.',
    category: 'Tasks',
    tags: ['groceries', 'food', 'brunch', 'shopping'],
    entities: [
      { name: 'Sunday', type: 'date' },
      { name: 'oat milk', type: 'object' },
      { name: 'espresso beans', type: 'object' },
    ],
    sentiment: 'neutral',
    isPinned: false,
    importance: 3,
    reminders: [
      {
        title: 'Buy brunch groceries before Sunday',
        remindAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        isCompleted: false,
      },
    ],
    actionItems: ['Buy oat milk', 'Buy espresso beans', 'Buy sourdough bread', 'Buy avocados'],
  },
  {
    title: 'Voice-Activated Micro-Journaling Concept',
    transcript: 'Idea for an app feature: 30-second evening voice reflections where the AI generates a single gratitude prompt and auto-detects cognitive mood trends over months.',
    summary: 'Evening micro-journaling feature with daily AI gratitude prompts and monthly mood trend tracking.',
    category: 'Ideas',
    tags: ['ideas', 'journaling', 'product', 'ai', 'feature'],
    entities: [
      { name: 'Micro-Journaling', type: 'concept' },
      { name: 'Gratitude Prompt', type: 'concept' },
    ],
    sentiment: 'positive',
    isPinned: true,
    importance: 5,
    reminders: [],
    actionItems: ['Sketch micro-journaling UI flow'],
  },
  {
    title: 'Machine Learning Transformers Notes',
    transcript: 'Studied Attention is All You Need paper. Multi-head self-attention allows the model to jointly attend to information from different representation subspaces at different positions.',
    summary: 'Transformer architecture notes: multi-head self-attention mechanisms and positional embeddings.',
    category: 'Study',
    tags: ['study', 'machine-learning', 'transformers', 'attention', 'notes'],
    entities: [
      { name: 'Attention is All You Need', type: 'concept' },
      { name: 'Multi-Head Attention', type: 'concept' },
    ],
    sentiment: 'thoughtful',
    isPinned: false,
    importance: 4,
    reminders: [
      {
        title: 'Review Section 3.2 on scaled dot-product attention',
        remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isCompleted: false,
      },
    ],
    actionItems: ['Review scaled dot-product attention math'],
  },
  {
    title: 'Morning Mindfulness & Walking Routine',
    transcript: 'Starting 20-minute sunrise walks without headphones to clear mental chatter before morning standup. Track sleep consistency this week.',
    summary: '20-min daily sunrise walk without distractions. Focus on sleep consistency.',
    category: 'Personal',
    tags: ['personal', 'mindfulness', 'walking', 'routine', 'wellness'],
    entities: [
      { name: 'Sunrise walk', type: 'action' },
      { name: 'Morning standup', type: 'date' },
    ],
    sentiment: 'positive',
    isPinned: false,
    importance: 3,
    reminders: [
      {
        title: 'Complete morning walk before 8:00 AM',
        remindAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        isCompleted: true,
      },
    ],
    actionItems: ['Walk 20 minutes', 'Track sleep hours'],
  },
];

const seedDatabase = async () => {
  try {
    const count = await Memory.countDocuments();
    if (count === 0) {
      console.log('[Seed] Seeding realistic sample voice memories...');
      await Memory.insertMany(seedMemories);

      // Seed tags
      for (const mem of seedMemories) {
        for (const tag of mem.tags) {
          await Tag.findOneAndUpdate(
            { name: tag.toLowerCase() },
            { $inc: { usageCount: 1 }, $setOnInsert: { category: mem.category } },
            { upsert: true }
          ).catch(() => {});
        }
      }
      console.log('[Seed] Successfully seeded sample memories and tags.');
    }
  } catch (err) {
    console.warn(`[Seed] Notice: ${err.message}`);
  }
};

module.exports = seedDatabase;
