const BASE_URL = 'http://127.0.0.1:5000/api';

async function testTaskModule() {
  console.log('=== 1. FETCHING TASKS BY SECTION & COUNTS ===');
  const res = await fetch(`${BASE_URL}/tasks`);
  const data = await res.json();
  console.log('Total tasks count:', data.count);
  console.log('Section summary counts:', data.sections);

  console.log('\n=== 2. VERIFYING SECTIONS FILTERING ===');
  for (const s of ['upcoming', 'overdue', 'pending', 'completed']) {
    const sRes = await fetch(`${BASE_URL}/tasks?section=${s}`);
    const sData = await sRes.json();
    console.log(`Section "${s}": ${sData.count} tasks`);
    sData.data.forEach((t) => {
      const linkedMem = t.memory ? `[Linked Memory: "${t.memory.title}"]` : '[No Memory Link]';
      const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No Deadline';
      console.log(`   • (${t.priority.toUpperCase()}) "${t.title}" | Due: ${due} ${linkedMem}`);
    });
  }

  console.log('\n=== 3. CREATING A MANUAL TASK LINKED TO MEMORY ===');
  const createRes = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Practice React Native animations for task card swipes',
      description: 'Prepare smooth gesture transitions for task completion',
      priority: 'high',
      dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      category: 'Work',
    }),
  });
  const created = await createRes.json();
  console.log('Created task ID:', created.data._id, 'Status:', created.data.status);
  const taskId = created.data._id;

  console.log('\n=== 4. TOGGLING COMPLETION STATUS ===');
  const compRes = await fetch(`${BASE_URL}/tasks/${taskId}/complete`, { method: 'PATCH' });
  const compData = await compRes.json();
  console.log('Completed:', compData.data.isCompleted, 'CompletedAt:', compData.data.completedAt);

  console.log('\n=== 5. RESCHEDULING TASK ===');
  const newDue = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
  const reschedRes = await fetch(`${BASE_URL}/tasks/${taskId}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dueDate: newDue }),
  });
  const reschedData = await reschedRes.json();
  console.log('Rescheduled dueDate:', reschedData.data.dueDate);

  console.log('\n=== 6. CONFIRMING AMBIGUOUS DATE TASK ===');
  const ambigTask = data.data.find((t) => t.hasAmbiguousDate && !t.dateConfirmed);
  if (ambigTask) {
    console.log(`Found ambiguous task: "${ambigTask.title}" (${ambigTask.dueDateText})`);
    const confRes = await fetch(`${BASE_URL}/tasks/${ambigTask._id}/confirm-date`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmedDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() }),
    });
    const confData = await confRes.json();
    console.log('Confirmed:', confData.data.dateConfirmed, 'New due date:', confData.data.dueDate);
  }

  console.log('\n=== 7. DELETING TEST TASK ===');
  const delRes = await fetch(`${BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  console.log('Deleted test task:', delData.message);
}

testTaskModule().catch(console.error);
