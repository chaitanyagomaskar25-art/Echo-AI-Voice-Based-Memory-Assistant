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

async function restoreDatabase() {
  const backupsRoot = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupsRoot)) {
    console.error('No backups directory found.');
    return;
  }

  // Find most recent backup or take path from CLI argument
  let targetDir = process.argv[2];
  if (!targetDir) {
    const dirs = fs.readdirSync(backupsRoot)
      .filter((d) => fs.statSync(path.join(backupsRoot, d)).isDirectory())
      .sort()
      .reverse();
    if (dirs.length === 0) {
      console.error('No backup directories found inside backend/backups/');
      return;
    }
    targetDir = path.join(backupsRoot, dirs[0]);
  }

  console.log(`[Restore] Restoring from: ${targetDir}`);
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/echo_memory_db';
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

  for (const col of collections) {
    const filePath = path.join(targetDir, `${col.name}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const docs = JSON.parse(raw);
        if (docs.length > 0) {
          await col.model.deleteMany({});
          await col.model.insertMany(docs);
          console.log(`✓ Restored ${col.name}: ${docs.length} documents.`);
        }
      } catch (e) {
        console.warn(`⚠ Could not restore ${col.name}:`, e.message);
      }
    }
  }

  console.log(`\n=======================================================`);
  console.log(`✓ Database restore complete from ${targetDir}`);
  console.log(`=======================================================`);

  await mongoose.disconnect();
}

restoreDatabase().catch((err) => {
  console.error('[Restore Error]:', err);
  process.exit(1);
});
