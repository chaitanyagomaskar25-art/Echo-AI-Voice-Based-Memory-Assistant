// Native fetch in Node 18+
const BASE_URL = 'http://127.0.0.1:5000/api';

const testQueries = [
  'What did I decide last week?',
  'What was the project idea I discussed?',
  'When did I mention my exam preparation?',
  'What tasks did I promise to complete?',
  'Find the conversation where I discussed my business idea.',
];

async function runTests() {
  console.log('=== 1. TESTING SEMANTIC SEARCH ENDPOINT (/api/memories/semantic-search) ===\n');

  for (const query of testQueries) {
    console.log(`🔍 Query: "${query}"`);
    const res = await fetch(`${BASE_URL}/memories/semantic-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 2 }),
    });

    const data = await res.json();
    if (!data.success) {
      console.error('FAILED:', data);
      continue;
    }

    console.log(`Found ${data.count} results:`);
    data.data.forEach((item, idx) => {
      console.log(`  [#${idx + 1}] (${item.relevanceScore}% match) "${item.title}" [${item.category}]`);
      console.log(`       Summary: ${item.summary}`);
      console.log(`       Original transcript: "${item.originalTranscript?.substring(0, 70)}..."`);
    });
    console.log('--------------------------------------------------');
  }

  console.log('\n=== 2. TESTING CONVERSATIONAL RAG & CITATIONS (/api/ai/ask) ===\n');

  for (const question of testQueries.slice(0, 3)) {
    console.log(`💬 Asking Echo: "${question}"`);
    const res = await fetch(`${BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    if (!data.success) {
      console.error('FAILED:', data);
      continue;
    }

    console.log(`Echo Answer: ${data.data.answer}`);
    console.log(`Cited Memories: ${data.data.citedMemories.length}`);
    data.data.citedMemories.forEach((c) => {
      console.log(`   - "${c.title}" (${c.relevanceScore}% match)`);
    });
    console.log('--------------------------------------------------');
  }

  console.log('\n=== 3. TESTING ANTI-HALLUCINATION / GROUNDING SAFETY GUARD ===\n');
  const unsupportedQ = 'What is the secret recipe for chocolate cake that I cooked in Antarctica in 1982?';
  console.log(`Query: "${unsupportedQ}"`);
  const res = await fetch(`${BASE_URL}/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: unsupportedQ }),
  });
  const data = await res.json();
  console.log(`Echo Guardrail Response: ${data.data.answer}`);
  console.log(`Cited memories count: ${data.data.citedMemories.length} (Expected: 0)`);
  console.log(`Confidence: ${data.data.confidence} (Expected: 0)`);
}

runTests().catch(console.error);
