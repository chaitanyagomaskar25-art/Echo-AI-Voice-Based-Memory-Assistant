const BASE_URL = 'http://127.0.0.1:5000/api';

async function testConversations() {
  console.log('=== 1. CREATING NEW CONVERSATION ===');
  const createRes = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Weekly Productivity Review' }),
  });
  const createData = await createRes.json();
  console.log('Created conversation ID:', createData.data._id);
  const convId = createData.data._id;

  const testQueries = [
    'What did I work on yesterday?',
    'Summarize my learning progress this week.',
    'What ideas have I saved about startups?',
    'Which tasks are still pending?',
    'Where is the secret treasure chest I buried in Atlantis in 1700?',
  ];

  for (const q of testQueries) {
    console.log(`\n💬 USER ASKS: "${q}"`);
    const sendRes = await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: q }),
    });
    const sendData = await sendRes.json();
    if (!sendData.success) {
      console.error('ERROR:', sendData);
      continue;
    }
    console.log('🤖 ECHO REPLIES:\n' + sendData.data.echoMessage.text);
    console.log(`📌 Cited References (${sendData.data.echoMessage.citedMemories.length}):`);
    sendData.data.echoMessage.citedMemories.forEach((c) => {
      console.log(`   - "${c.title}" [${c.category}] (Recorded: ${new Date(c.createdAt).toLocaleDateString()}, Match: ${c.relevanceScore}%)`);
    });
  }

  console.log('\n=== 2. LISTING ALL CONVERSATIONS ===');
  const listRes = await fetch(`${BASE_URL}/conversations`);
  const listData = await listRes.json();
  console.log(`Total conversations: ${listData.count}`);
  listData.data.forEach((c) => {
    console.log(`- [${c._id}] "${c.title}" (${c.messageCount} messages, Last: "${c.lastMessageSnippet.substring(0, 40)}...")`);
  });

  console.log('\n=== 3. DELETING TEST CONVERSATION ===');
  const delRes = await fetch(`${BASE_URL}/conversations/${convId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  console.log('Delete result:', delData.message);
}

testConversations().catch(console.error);
