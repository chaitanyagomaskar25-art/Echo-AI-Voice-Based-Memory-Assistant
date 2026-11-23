const BASE_URL = 'http://127.0.0.1:5000/api';

async function testReminderModule() {
  console.log('=== 1. FETCHING NOTIFICATION PREFERENCES ===');
  const prefRes = await fetch(`${BASE_URL}/reminders/preferences`);
  const prefData = await prefRes.json();
  console.log('Preferences:', prefData.data);

  console.log('\n=== 2. UPDATING NOTIFICATION PREFERENCES ===');
  const updatePrefRes = await fetch(`${BASE_URL}/reminders/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pushEnabled: true,
      taskRemindersEnabled: true,
      upcomingTasksAdvanceNotice: 45,
      soundEnabled: true,
      vibrationEnabled: true,
    }),
  });
  const updatedPref = await updatePrefRes.json();
  console.log('Updated Advance Notice:', updatedPref.data.upcomingTasksAdvanceNotice, 'Push:', updatedPref.data.pushEnabled);

  console.log('\n=== 3. CREATING A REMINDER (PREVENTING DUPLICATES) ===');
  // First reminder
  const now = Date.now();
  const remindTime = new Date(now + 2 * 3600 * 1000).toISOString();
  const createRes1 = await fetch(`${BASE_URL}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Review Machine Learning Transformers notes',
      note: 'Prepare questions for tomorrow study group',
      remindAt: remindTime,
      sourceType: 'custom',
      notificationId: 'notif-ML-1',
    }),
  });
  const rem1 = await createRes1.json();
  console.log('Created Reminder 1 ID:', rem1.data._id, 'Status:', rem1.data.status);
  const remId = rem1.data._id;

  console.log('\n=== 4. SNOOZING REMINDER ===');
  const snoozeRes = await fetch(`${BASE_URL}/reminders/${remId}/snooze`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes: 15, notificationId: 'notif-ML-snoozed' }),
  });
  const snoozeData = await snoozeRes.json();
  console.log('Snoozed until:', snoozeData.data.snoozedUntil, 'Count:', snoozeData.data.snoozeCount, 'Status:', snoozeData.data.status);

  console.log('\n=== 5. RESCHEDULING REMINDER ===');
  const newTime = new Date(now + 6 * 3600 * 1000).toISOString();
  const reschedRes = await fetch(`${BASE_URL}/reminders/${remId}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remindAt: newTime }),
  });
  const reschedData = await reschedRes.json();
  console.log('Rescheduled remindAt:', reschedData.data.remindAt, 'Status:', reschedData.data.status);

  console.log('\n=== 6. MARKING REMINDER AS COMPLETED ===');
  const compRes = await fetch(`${BASE_URL}/reminders/${remId}/complete`, { method: 'PATCH' });
  const compData = await compRes.json();
  console.log('Completed:', compData.data.isCompleted, 'CompletedAt:', compData.data.completedAt);

  console.log('\n=== 7. LISTING ALL REMINDERS ===');
  const listRes = await fetch(`${BASE_URL}/reminders`);
  const listData = await listRes.json();
  console.log('Total reminders:', listData.count, 'Counts:', listData.counts);

  console.log('\n=== 8. DELETING / CANCELLING REMINDER ===');
  const delRes = await fetch(`${BASE_URL}/reminders/${remId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  console.log('Delete result:', delData.message, 'Cancelled notificationId:', delData.notificationId);
}

testReminderModule().catch(console.error);
