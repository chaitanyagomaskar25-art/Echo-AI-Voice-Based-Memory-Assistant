const BASE_URL = 'http://127.0.0.1:5000/api/recaps';

async function testRecapModule() {
  console.log('=== TEST 1: GENERATING DAILY RECAP ===');
  const res1 = await fetch(`${BASE_URL}?type=daily`);
  const data1 = await res1.json();
  console.log('Success:', data1.success, 'isCached:', data1.isCached);
  console.log('Headline:', data1.data?.headline);
  console.log('Overview:', data1.data?.overview);
  console.log('Sections:');
  console.log(' - Things Learned:', data1.data?.sections?.thingsLearned?.length);
  console.log(' - Ideas Captured:', data1.data?.sections?.ideasCaptured?.length);
  console.log(' - Work Completed:', data1.data?.sections?.workCompleted?.length);
  console.log(' - Tasks Pending:', data1.data?.sections?.tasksPending?.length);
  console.log(' - Upcoming Deadlines:', data1.data?.sections?.upcomingDeadlines?.length);
  console.log(' - Important Decisions:', data1.data?.sections?.importantDecisions?.length);

  console.log('\n=== TEST 2: TESTING CACHE HIT ===');
  const res2 = await fetch(`${BASE_URL}?type=daily`);
  const data2 = await res2.json();
  console.log('Success:', data2.success, 'isCached (should be true):', data2.isCached);

  console.log('\n=== TEST 3: TESTING FORCE REFRESH ===');
  const res3 = await fetch(`${BASE_URL}?type=daily&force=true`);
  const data3 = await res3.json();
  console.log('Success:', data3.success, 'isCached (should be false on force):', data3.isCached);

  console.log('\n=== TEST 4: TESTING WEEKLY RECAP ===');
  const res4 = await fetch(`${BASE_URL}?type=weekly`);
  const data4 = await res4.json();
  console.log('Success:', data4.success, 'Period:', data4.data?.periodLabel);
  console.log('Weekly headline:', data4.data?.headline);
  console.log('Weekly memories:', data4.data?.stats?.totalMemories);

  console.log('\n=== TEST 5: TESTING DATE-BASED HISTORY ===');
  const res5 = await fetch(`${BASE_URL}/history?type=daily&limit=7`);
  const data5 = await res5.json();
  console.log('Success:', data5.success, 'History count:', data5.data?.length);
  console.log('Sample days:');
  data5.data?.slice(0, 3).forEach((d) => {
    console.log(` - ${d.displayLabel}: ${d.memoryCount} memories, cached: ${d.hasCachedRecap}`);
  });

  console.log('\n=== TEST 6: VERIFY MEMORY LINKING ===');
  const sampleLearned = data1.data?.sections?.thingsLearned?.[0];
  const sampleIdea = data1.data?.sections?.ideasCaptured?.[0];
  const sampleWork = data1.data?.sections?.workCompleted?.[0];
  console.log('Sample Learned item:', sampleLearned ? { text: sampleLearned.text, memoryId: sampleLearned.memoryId, memoryTitle: sampleLearned.memoryTitle } : 'None');
  console.log('Sample Idea item:', sampleIdea ? { text: sampleIdea.text, memoryId: sampleIdea.memoryId, memoryTitle: sampleIdea.memoryTitle } : 'None');
  console.log('Sample Work item:', sampleWork ? { text: sampleWork.text, memoryId: sampleWork.memoryId, memoryTitle: sampleWork.memoryTitle } : 'None');

  console.log('\n=== ALL BACKEND RECAP TESTS COMPLETE ===');
}

testRecapModule().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
