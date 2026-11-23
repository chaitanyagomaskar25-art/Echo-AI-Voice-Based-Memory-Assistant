const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Memory = require('../src/models/Memory');
const Task = require('../src/models/Task');
const Reminder = require('../src/models/Reminder');
const NotificationPreference = require('../src/models/NotificationPreference');
const Conversation = require('../src/models/Conversation');
const Recap = require('../src/models/Recap');
const User = require('../src/models/User');
const Tag = require('../src/models/Tag');

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups', `backup_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/echo_memory_db';
  console.log(`[Backup] Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  const collections = [
    { name: 'memories', model: Memory },
    { name: 'tasks', model: Task },
    { name: 'reminders', model: Reminder },
    { name: 'notification_preferences', model: NotificationPreference },
    { name: 'conversations', model: Conversation },
    { name: 'recaps', model: Recap },
    { name: 'users', model: User },
    { name: 'tags', model: Tag },
  ];

  const summary = {
    backupTimestamp: new Date().toISOString(),
    database: mongoose.connection.name,
    collections: {},
  };

  for (const col of collections) {
    try {
      const docs = await col.model.find().lean();
      const filePath = path.join(backupDir, `${col.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      summary.collections[col.name] = docs.length;
      console.log(`✓ Exported ${col.name}: ${docs.length} documents -> ${filePath}`);
    } catch (e) {
      console.warn(`⚠ Could not backup collection ${col.name}:`, e.message);
    }
  }

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(summary, null, 2));
  console.log(`\n=======================================================`);
  console.log(`✓ Backup successfully created at: ${backupDir}`);
  console.log(`=======================================================`);

  await mongoose.disconnect();
}

backupDatabase().catch((err) => {
  console.error('[Backup Error]:', err);
  process.exit(1);
});
