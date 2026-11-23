const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Memory = require('../src/models/Memory');
const Task = require('../src/models/Task');
const Conversation = require('../src/models/Conversation');
const Reminder = require('../src/models/Reminder');

const API_BASE = 'http://localhost:5000/api';

async function testProductionReadiness() {
  console.log('=======================================================');
  console.log(' ECHO PRODUCTION-READINESS TEST SUITE');
  console.log('=======================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/echo_memory_db';
  await mongoose.connect(mongoUri);
  console.log('✓ Connected directly to MongoDB for assertion verification\n');

  try {
    // 1. Health Check Endpoint
    console.log('--- Test 1: Monitoring & Health Endpoint ---');
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    console.log('Health Status:', healthData.status);
    console.log('Database Status:', healthData.database?.status);
    console.log('Memory Heap Used (MB):', healthData.system?.heapUsedMB);
    if (healthData.status !== 'healthy' || healthData.database?.status !== 'connected') {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }
    console.log('✓ Health and monitoring metrics verified\n');

    // 2. Correlation ID Header Verification
    console.log('--- Test 2: Correlation Request-ID Tracking ---');
    const customReqId = `test-req-${Date.now()}`;
    const corrRes = await fetch(`${API_BASE}/health`, {
      headers: { 'X-Request-ID': customReqId },
    });
    const returnedReqId = corrRes.headers.get('x-request-id');
    console.log('Sent X-Request-ID:', customReqId);
    console.log('Received X-Request-ID:', returnedReqId);
    if (returnedReqId !== customReqId) {
      throw new Error(`Request ID propagation failed: expected ${customReqId}, got ${returnedReqId}`);
    }
    console.log('✓ Request correlation ID properly tracked and propagated\n');

    // 3. Request Payload Validation
    console.log('--- Test 3: Request Validation & Bad Input Rejection ---');
    // Invalid email
    const badRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'not-an-email', password: '123' }),
    });
    const badRegData = await badRegRes.json();
    console.log('Bad Register Status:', badRegRes.status);
    console.log('Validation Error Code:', badRegData.error?.code);
    if (badRegRes.status !== 400 || badRegData.error?.code !== 'VALIDATION_ERROR') {
      throw new Error(`Input validation failed to catch invalid register payload: ${JSON.stringify(badRegData)}`);
    }

    // Invalid ObjectId format
    const badIdRes = await fetch(`${API_BASE}/memories/invalid-mongo-id-123`);
    const badIdData = await badIdRes.json();
    console.log('Invalid ObjectId Status:', badIdRes.status);
    console.log('Invalid ObjectId Code:', badIdData.error?.code);
    if (badIdRes.status !== 400 || badIdData.error?.code !== 'INVALID_ID_FORMAT') {
      throw new Error(`ObjectId validation failed to reject malformed ID: ${JSON.stringify(badIdData)}`);
    }
    console.log('✓ Request validation and standardized error format verified\n');

    // 4. User Registration, Authentication & Data Isolation
    console.log('--- Test 4: User Authentication & Strict Data Isolation ---');
    const userAEmail = `user_a_${Date.now()}@test.ai`;
    const userBEmail = `user_b_${Date.now()}@test.ai`;

    // Register User A
    const regARes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: userAEmail, password: 'password123' }),
    });
    const regAData = await regARes.json();
    const tokenA = regAData.token;
    const userAId = regAData.user?.id;
    console.log(`Registered User A (${userAEmail}):`, userAId);

    // Register User B
    const regBRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: userBEmail, password: 'password123' }),
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.token;
    const userBId = regBData.user?.id;
    console.log(`Registered User B (${userBEmail}):`, userBId);

    // User A creates a memory
    const memARes = await fetch(`${API_BASE}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: "User A Confidential Strategic Memo",
        transcript: "Confidential plan for User A proprietary project.",
        category: "Work",
      }),
    });
    const memAData = await memARes.json();
    const memAId = memAData.data?._id;
    console.log('User A created memory:', memAId);

    // User B tries to read User A's memory directly -> should be 403 Forbidden
    const getMemBRes = await fetch(`${API_BASE}/memories/${memAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    console.log("User B access to User A's memory status:", getMemBRes.status);
    if (getMemBRes.status !== 403) {
      throw new Error(`Data isolation violation! Expected HTTP 403, got ${getMemBRes.status}`);
    }

    // User B tries to update User A's memory -> should be 403 Forbidden
    const putMemBRes = await fetch(`${API_BASE}/memories/${memAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ title: 'Hacked by User B' }),
    });
    console.log("User B update to User A's memory status:", putMemBRes.status);
    if (putMemBRes.status !== 403) {
      throw new Error(`Authorization check failed! Expected HTTP 403, got ${putMemBRes.status}`);
    }

    // User B lists memories -> User A's memory must NOT appear
    const listMemBRes = await fetch(`${API_BASE}/memories`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const listMemBData = await listMemBRes.json();
    const leaked = listMemBData.data?.some((m) => m._id === memAId);
    console.log("User A memory in User B's list?:", leaked);
    if (leaked) {
      throw new Error("Data isolation violation! User A's memory appeared in User B's list.");
    }
    console.log('✓ Strict user-specific data isolation verified across authenticated users\n');

    // 5. Secure Audio Upload Validation
    console.log('--- Test 5: Secure Audio Upload & File Signature Validation ---');
    // Disguised fake script file
    const fakeForm = new FormData();
    const fakeBlob = new Blob(['#!/bin/bash\necho "Disguised malicious payload"'], { type: 'audio/m4a' });
    fakeForm.append('audio', fakeBlob, 'malicious.m4a');

    const fakeUploadRes = await fetch(`${API_BASE}/audio/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: fakeForm,
    });
    const fakeUploadData = await fakeUploadRes.json();
    console.log('Fake Audio Upload Status:', fakeUploadRes.status);
    console.log('Fake Audio Error Code:', fakeUploadData.error?.code);
    if (fakeUploadRes.status !== 400 || fakeUploadData.error?.code !== 'INVALID_AUDIO_SIGNATURE') {
      throw new Error(`Audio signature verification failed to block fake audio: ${JSON.stringify(fakeUploadData)}`);
    }
    console.log('✓ Binary audio signature validation successfully rejected disguised file\n');

    // 6. User Account Deletion & GDPR Data Purge
    console.log('--- Test 6: Account Deletion & Data Cascade Purge (GDPR) ---');
    // Create a task and reminder for User A
    await Task.create({ title: 'User A Task', user: userAId });
    await Reminder.create({ title: 'User A Reminder', remindAt: new Date(), user: userAId });
    await Conversation.create({ title: 'User A Chat', user: userAId });

    // Request account deletion
    const delRes = await fetch(`${API_BASE}/auth/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const delData = await delRes.json();
    console.log('Account Deletion Status:', delRes.status);
    console.log('Deletion Response Message:', delData.message);

    // Verify all records for User A are gone from database
    const remainingMems = await Memory.countDocuments({ user: userAId });
    const remainingTasks = await Task.countDocuments({ user: userAId });
    const remainingReminders = await Reminder.countDocuments({ user: userAId });
    const remainingConvs = await Conversation.countDocuments({ user: userAId });
    const remainingUser = await User.findById(userAId);

    console.log('Remaining User A Memories:', remainingMems);
    console.log('Remaining User A Tasks:', remainingTasks);
    console.log('Remaining User A Reminders:', remainingReminders);
    console.log('Remaining User A Conversations:', remainingConvs);
    console.log('User Document Exists?:', Boolean(remainingUser));

    if (remainingMems !== 0 || remainingTasks !== 0 || remainingReminders !== 0 || remainingConvs !== 0 || remainingUser) {
      throw new Error('GDPR account deletion failed to cascade delete all user documents!');
    }
    console.log('✓ Account deletion and GDPR data purge verified with zero orphaned records\n');

    // Clean up User B
    await User.findByIdAndDelete(userBId);

    // 7. Test Database Backup Utility
    console.log('--- Test 7: Automated Database Backup Utility ---');
    const { execSync } = require('child_process');
    const backupOutput = execSync('node backend/scripts/backupDatabase.js', { encoding: 'utf8' });
    console.log(backupOutput.trim().split('\n').slice(-4).join('\n'));
    console.log('✓ Database backup script verified\n');

    console.log('=======================================================');
    console.log('✓ ALL PRODUCTION READINESS CHECKS PASSED SUCCESSFULLY!');
    console.log('=======================================================');
  } catch (err) {
    console.error('\n✖ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

testProductionReadiness();
