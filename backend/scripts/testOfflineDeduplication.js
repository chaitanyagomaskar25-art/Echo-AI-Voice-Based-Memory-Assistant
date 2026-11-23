const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Memory = require('../src/models/Memory');

const API_BASE = 'http://localhost:5000/api';

async function testOfflineDeduplication() {
  console.log('--- Starting Offline Deduplication & Sync Verification ---');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/echo_memory_db';
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB');

  const testLocalId = `offline_test_${Date.now()}`;
  console.log(`Generated Test Client Local ID: ${testLocalId}`);

  // Create a dummy audio buffer for testing
  const dummyBuffer = Buffer.from('RIFF....WAVEfmt ....data....test-audio');
  const blob = new Blob([dummyBuffer], { type: 'audio/m4a' });

  try {
    // 1. First upload request with clientLocalId
    console.log('\n1. Sending initial offline upload request...');
    const form1 = new FormData();
    form1.append('audio', blob, 'test.m4a');
    form1.append('clientLocalId', testLocalId);
    form1.append('title', 'Offline Voice Note Test');
    form1.append('category', 'Ideas');
    form1.append('saveImmediately', 'true');

    const res1 = await fetch(`${API_BASE}/audio/upload`, {
      method: 'POST',
      body: form1,
    });
    const data1 = await res1.json();

    console.log('Response 1 Status:', res1.status);
    console.log('Response 1 Deduplicated:', data1.deduplicated || false);
    console.log('Response 1 Memory ID:', data1.data?.memory?._id || data1.data?._id);

    if (res1.status !== 200 && res1.status !== 201) {
      throw new Error(`First upload failed with status ${res1.status}: ${JSON.stringify(data1)}`);
    }

    // 2. Duplicate upload request with same clientLocalId (simulating retry or network reconnect)
    console.log('\n2. Sending duplicate upload request with identical clientLocalId...');
    const form2 = new FormData();
    form2.append('audio', blob, 'test.m4a');
    form2.append('clientLocalId', testLocalId);
    form2.append('title', 'Offline Voice Note Test - Duplicate Attempt');
    form2.append('category', 'Ideas');
    form2.append('saveImmediately', 'true');

    const res2 = await fetch(`${API_BASE}/audio/upload`, {
      method: 'POST',
      body: form2,
    });
    const data2 = await res2.json();

    console.log('Response 2 Status:', res2.status);
    console.log('Response 2 Deduplicated flag:', data2.deduplicated);
    console.log('Response 2 Message:', data2.message);

    if (!data2.deduplicated) {
      throw new Error('Deduplication failed! Second response did not have deduplicated: true');
    }

    // 3. Verify in MongoDB that only ONE record exists
    console.log('\n3. Checking MongoDB database for duplicate entries...');
    const count = await Memory.countDocuments({ clientLocalId: testLocalId });
    console.log(`Matching records in MongoDB for ${testLocalId}: ${count}`);

    if (count !== 1) {
      throw new Error(`Expected exactly 1 document in MongoDB, found ${count}!`);
    }

    console.log('\n✓ ZERO DUPLICATES VERIFIED: Server-side idempotency guaranteed!');

    // Cleanup
    await Memory.deleteMany({ clientLocalId: testLocalId });
    console.log('✓ Cleaned up test records from MongoDB');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

testOfflineDeduplication();
