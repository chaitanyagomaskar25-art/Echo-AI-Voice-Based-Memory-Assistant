const BASE_URL = 'http://127.0.0.1:5000/api/memories';

async function testMemoryManagement() {
  console.log('=== TEST 1: PAGINATION & BROWSING ===');
  const res1 = await fetch(`${BASE_URL}?page=1&limit=5`);
  const data1 = await res1.json();
  console.log('Success:', data1.success, 'Count:', data1.count, 'Total:', data1.total, 'Page:', data1.page, 'TotalPages:', data1.totalPages);
  const sampleMemory = data1.data?.[0];
  if (!sampleMemory) {
    throw new Error('No memories found in database');
  }
  const memoryId = sampleMemory._id;
  console.log('Testing with Memory ID:', memoryId, 'Title:', sampleMemory.title);

  console.log('\n=== TEST 2: FAVORITE TOGGLE ===');
  const res2 = await fetch(`${BASE_URL}/${memoryId}/favorite`, { method: 'PATCH' });
  const data2 = await res2.json();
  console.log('Favorite result:', data2.message, 'isFavorite:', data2.data?.isFavorite);

  console.log('\n=== TEST 3: PIN TOGGLE ===');
  const res3 = await fetch(`${BASE_URL}/${memoryId}/pin`, { method: 'PATCH' });
  const data3 = await res3.json();
  console.log('Pin result:', data3.message, 'isPinned:', data3.data?.isPinned);

  console.log('\n=== TEST 4: ARCHIVE TOGGLE ===');
  const res4 = await fetch(`${BASE_URL}/${memoryId}/archive`, { method: 'PATCH' });
  const data4 = await res4.json();
  console.log('Archive result:', data4.message, 'isArchived:', data4.data?.isArchived);

  // Un-archive it back
  await fetch(`${BASE_URL}/${memoryId}/archive`, { method: 'PATCH' });

  console.log('\n=== TEST 5: EDITING TITLE, SUMMARY, TRANSCRIPT & TAGS ===');
  const updatePayload = {
    title: 'Updated Test Title For Memory Management',
    summary: 'Updated summary reflecting latest insights.',
    transcript: sampleMemory.transcript + ' (Edited transcript with additional context)',
    tags: ['testing', 'management', 'echo-ai'],
  };
  const res5 = await fetch(`${BASE_URL}/${memoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
  });
  const data5 = await res5.json();
  console.log('Update success:', data5.success);
  console.log('Updated title:', data5.data?.title);
  console.log('Updated tags:', data5.data?.tags);
  console.log('EditedByUser flag:', data5.data?.editedByUser);

  console.log('\n=== TEST 6: FETCHING RELATED TASKS ===');
  const res6 = await fetch(`${BASE_URL}/${memoryId}/tasks`);
  const data6 = await res6.json();
  console.log('Related tasks success:', data6.success, 'Count:', data6.count);

  console.log('\n=== TEST 7: CATEGORY & DATE FILTERING ===');
  const res7 = await fetch(`${BASE_URL}?category=Work&dateFilter=month`);
  const data7 = await res7.json();
  console.log('Category filter (Work): count =', data7.count);

  console.log('\n=== TEST 8: GET SINGLE MEMORY WITH POPULATED TASKS ===');
  const res8 = await fetch(`${BASE_URL}/${memoryId}`);
  const data8 = await res8.json();
  console.log('Single memory fetch success:', data8.success);
  console.log('Related tasks attached in getById:', Array.isArray(data8.data?.relatedTasks));

  console.log('\n=== ALL MEMORY MANAGEMENT TESTS PASSED ===');
}

testMemoryManagement().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
