const mongoose = require('mongoose');
const Task = require('../src/models/Task');
const Memory = require('../src/models/Memory');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function seedTasks() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/echo_memory_db');

  console.log('Seeding tasks linked to memories...');

  // Clear existing tasks to avoid duplicates during test
  await Task.deleteMany({});

  const memories = await Memory.find();
  const memoryMap = {};
  memories.forEach((m) => {
    memoryMap[m.title] = m._id;
  });

  const now = new Date();

  // 1. Upcoming Tasks (Explicit future deadlines)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 0, 0, 0); // 3:00 PM tomorrow

  const friday = new Date(now);
  friday.setDate(friday.getDate() + 4);
  friday.setHours(17, 0, 0, 0);

  // 2. Overdue Task (Explicit deadline passed)
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - 2);
  pastDate.setHours(14, 0, 0, 0);

  // 3. Completed Task
  const completedDate = new Date(now);
  completedDate.setDate(completedDate.getDate() - 1);

  const sampleTasks = [
    // Upcoming
    {
      title: 'Submit secure authentication flow & complete API docs',
      description: 'Extracted from voice memo: "Sync with Sarah and Marcus regarding Project Falcon. Need to submit the secure authentication flow and complete API documentation by tomorrow 3 PM."',
      dueDate: tomorrow,
      dueDateText: 'tomorrow at 3 PM',
      hasAmbiguousDate: false,
      dateConfirmed: true,
      priority: 'urgent',
      status: 'upcoming',
      isCompleted: false,
      category: 'Work',
      memory: memoryMap['Sync with Sarah and Marcus regarding Project'] || memories[0]?._id,
    },
    {
      title: 'Finalize quarterly roadmap budget allocations',
      description: 'Extracted from voice memo: "Quarterly Roadmap & Budget Sync. Make sure to finalize budget allocations by Friday."',
      dueDate: friday,
      dueDateText: 'by Friday',
      hasAmbiguousDate: false,
      dateConfirmed: true,
      priority: 'high',
      status: 'upcoming',
      isCompleted: false,
      category: 'Work',
      memory: memoryMap['Quarterly Roadmap & Budget Sync'] || memories[0]?._id,
    },
    // Overdue
    {
      title: 'Submit quarterly vendor expense receipts',
      description: 'Extracted from voice memo: "Need to submit all vendor receipts for reimbursement before the end of the month audit."',
      dueDate: pastDate,
      dueDateText: '2 days ago',
      hasAmbiguousDate: false,
      dateConfirmed: true,
      priority: 'urgent',
      status: 'overdue',
      isCompleted: false,
      category: 'Work',
      memory: memoryMap['Architecture Review Takeaways'] || memories[0]?._id,
    },
    // Pending (No deadline explicitly mentioned - never invent deadlines)
    {
      title: 'Review scaled dot-product attention math in Section 3.2',
      description: 'Extracted from voice memo: "Studied Attention is All You Need paper. Need to review scaled dot-product attention math."',
      dueDate: null,
      dueDateText: '',
      hasAmbiguousDate: false,
      dateConfirmed: true,
      priority: 'medium',
      status: 'pending',
      isCompleted: false,
      category: 'Study',
      memory: memoryMap['Machine Learning Transformers Notes'] || memories[0]?._id,
    },
    {
      title: 'Draft pricing page mockups for Freemium tier',
      description: 'Extracted from voice memo: "Discussed SaaS business idea. Action item: draft pricing page mockups and test willingness to pay."',
      dueDate: null,
      dueDateText: '',
      hasAmbiguousDate: false,
      dateConfirmed: true,
      priority: 'high',
      status: 'pending',
      isCompleted: false,
      category: 'Ideas',
      memory: memoryMap['Voice AI SaaS Business Idea & Monetization'] || memories[0]?._id,
    },
    {
      title: 'Buy organic oat milk, espresso beans, and avocados',
      description: 'Extracted from voice memo: "Don\'t forget to buy organic oat milk, espresso beans, fresh sourdough, and avocados for Sunday brunch."',
      dueDate: null,
      dueDateText: '',
      hasAmbiguousDate: false,
      dateConfirmed: true,
      priority: 'low',
      status: 'pending',
      isCompleted: false,
      category: 'Tasks',
      memory: memoryMap['Weekend Grocery Checklist'] || memories[0]?._id,
    },
    // Ambiguous Date Task (Requires user confirmation before scheduling reminders!)
    {
      title: 'Schedule follow-up discussion on Notion integration',
      description: 'Extracted from voice memo: "We should sync on Notion and Obsidian partnerships sometime next week."',
      dueDate: null,
      dueDateText: 'sometime next week',
      hasAmbiguousDate: true,
      dateConfirmed: false,
      priority: 'medium',
      status: 'pending',
      isCompleted: false,
      category: 'Ideas',
      memory: memoryMap['Voice AI SaaS Business Idea & Monetization'] || memories[0]?._id,
    },
    // Completed
    {
      title: 'Connect Whisper speech-to-text API and resolve buffer sync',
      description: 'Extracted from voice memo: "Implemented audio waveform visualization and connected Whisper API."',
      dueDate: completedDate,
      dueDateText: 'yesterday',
      hasAmbiguousDate: false,
      dateConfirmed: true,
      priority: 'high',
      status: 'completed',
      isCompleted: true,
      completedAt: completedDate,
      category: 'Work',
      memory: memoryMap['Audio Waveform & Whisper API Integration'] || memories[0]?._id,
    },
  ];

  for (const t of sampleTasks) {
    await Task.create(t);
  }

  console.log(`Successfully seeded ${sampleTasks.length} tasks!`);
  await mongoose.disconnect();
}

seedTasks().catch(console.error);
