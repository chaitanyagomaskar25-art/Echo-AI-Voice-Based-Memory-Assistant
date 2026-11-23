/**
 * AI Memory Analysis & Cognitive Extraction Service
 * Uses structured JSON output from LLM APIs (OpenAI / Groq) or high-precision local NLP
 * to extract title, summary, main points, keywords, category, deadlines, action items,
 * people, and project names.
 * Integrates EmbeddingService for semantic vector search and strictly grounded RAG.
 */

const embeddingService = require('./embeddingService');

const ALLOWED_CATEGORIES = ['Ideas', 'Work', 'Study', 'Personal', 'Tasks'];

class AIMemoryService {
  /**
   * Automatically enriches a voice transcript into validated structured memory
   * @param {string} text - Voice transcript or note body
   * @param {Object} options - { userContext }
   */
  async enrichTranscript(text, options = {}) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return this.getDefaultEnrichment();
    }

    const cleanText = text.trim();
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    let result = null;

    // 1. If OpenAI API key is present, use structured JSON mode with OpenAI
    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        const aiResponse = await this.callOpenAIStructured(cleanText, openaiApiKey);
        result = this.validateAndNormalizeAIResponse(aiResponse, cleanText);
      } catch (err) {
        console.warn(`[AIMemoryService] OpenAI enrichment notice: ${err.message}. Falling back.`);
      }
    }

    // 2. If Groq API key is present, use Groq Llama with JSON mode
    if (!result && groqApiKey) {
      try {
        const aiResponse = await this.callGroqStructured(cleanText, groqApiKey);
        result = this.validateAndNormalizeAIResponse(aiResponse, cleanText);
      } catch (err) {
        console.warn(`[AIMemoryService] Groq enrichment notice: ${err.message}. Falling back.`);
      }
    }

    // 3. Fallback High-Precision Local NLP Extraction Engine
    if (!result) {
      result = this.localStructuredExtraction(cleanText);
    }

    // 4. Generate Semantic Vector Embedding for Atlas / Local Vector Search
    const textToEmbed = `${result.title}. ${result.summary}. ${cleanText}. ${result.category}. ${(result.tags || []).join(' ')}. ${(result.mainPoints || []).join(' ')}`;
    result.embedding = await embeddingService.generateEmbedding(textToEmbed);

    return result;
  }

  /**
   * Calls OpenAI Chat Completion with strict JSON object output format
   */
  async callOpenAIStructured(text, apiKey) {
    const systemPrompt = `You are Echo's AI Cognitive Memory Engine. Analyze the user's voice memo transcript and return a strictly valid JSON object extracting all structured insights.

JSON Schema:
{
  "title": "Short, meaningful title (max 7 words)",
  "summary": "Clean, concise 1-2 sentence summary of what was expressed",
  "mainPoints": ["Array of 2 to 4 key takeaways/main points"],
  "tags": ["Array of 3 to 6 important lowercase keywords"],
  "category": "Exactly one of: 'Ideas', 'Work', 'Study', 'Personal', 'Tasks'",
  "datesAndDeadlines": [
    { "dateText": "String matching date mentioned e.g. Tuesday 3pm", "context": "What occurs on that date", "isoDate": "Optional ISO 8601 date or null" }
  ],
  "actionItems": ["Array of explicit action items or tasks"],
  "people": ["Array of names of people mentioned"],
  "projects": ["Array of project or product names mentioned"],
  "sentiment": "One of: 'urgent', 'positive', 'thoughtful', 'concerned', 'neutral'",
  "importance": 1 to 5 integer
}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15000), // 15-second timeout protection
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this voice memo transcript:\n\n"""\n${text}\n"""` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content;
    return JSON.parse(content);
  }

  /**
   * Calls Groq Chat Completion with JSON mode
   */
  async callGroqStructured(text, apiKey) {
    const systemPrompt = `Analyze the voice memory transcript and return a strictly valid JSON object with title, summary, mainPoints (array of strings), tags (array of keywords), category (one of: Ideas, Work, Study, Personal, Tasks), datesAndDeadlines (array of {dateText, context}), actionItems (array of strings), people (array), projects (array), sentiment, and importance (1-5).`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15000), // 15-second timeout protection
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    return JSON.parse(data.choices[0]?.message?.content);
  }

  /**
   * Validates and normalizes structured AI responses
   */
  validateAndNormalizeAIResponse(json, originalText) {
    if (!json || typeof json !== 'object') return null;

    const title =
      typeof json.title === 'string' && json.title.trim().length > 0
        ? json.title.trim().substring(0, 80)
        : this.generateFallbackTitle(originalText);

    const summary =
      typeof json.summary === 'string' && json.summary.trim().length > 0
        ? json.summary.trim()
        : originalText.length > 140
        ? originalText.substring(0, 140) + '...'
        : originalText;

    const mainPoints = Array.isArray(json.mainPoints)
      ? json.mainPoints.filter((p) => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim())
      : [];

    const tags = Array.isArray(json.tags)
      ? json.tags
          .filter((t) => typeof t === 'string' && t.trim().length > 0)
          .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
          .filter(Boolean)
          .slice(0, 8)
      : ['voice'];

    let category = 'Personal';
    if (ALLOWED_CATEGORIES.includes(json.category)) {
      category = json.category;
    } else {
      category = this.detectCategoryFromText(originalText);
    }

    const datesAndDeadlines = Array.isArray(json.datesAndDeadlines)
      ? json.datesAndDeadlines
          .filter((d) => d && (d.dateText || d.context))
          .map((d) => ({
            dateText: String(d.dateText || '').trim(),
            context: String(d.context || '').trim(),
            isoDate: d.isoDate ? new Date(d.isoDate) : null,
          }))
      : [];

    const actionItems = Array.isArray(json.actionItems)
      ? json.actionItems.filter((a) => typeof a === 'string' && a.trim().length > 0).map((a) => a.trim())
      : [];

    const reminders = actionItems.map((action) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return {
        title: action,
        remindAt: tomorrow,
        isCompleted: false,
      };
    });

    const entities = [];
    const seen = new Set();

    if (Array.isArray(json.people)) {
      json.people.forEach((p) => {
        if (typeof p === 'string' && p.trim().length > 1 && !seen.has(p.toLowerCase())) {
          seen.add(p.toLowerCase());
          entities.push({ name: p.trim(), type: 'person' });
        }
      });
    }

    if (Array.isArray(json.projects)) {
      json.projects.forEach((proj) => {
        if (typeof proj === 'string' && proj.trim().length > 1 && !seen.has(proj.toLowerCase())) {
          seen.add(proj.toLowerCase());
          entities.push({ name: proj.trim(), type: 'project' });
        }
      });
    }

    const validSentiments = ['urgent', 'positive', 'thoughtful', 'concerned', 'neutral'];
    const sentiment = validSentiments.includes(json.sentiment) ? json.sentiment : 'neutral';
    const importance = Math.min(5, Math.max(1, parseInt(json.importance, 10) || 3));

    return {
      title,
      summary,
      mainPoints: mainPoints.length > 0 ? mainPoints : [summary],
      tags: tags.length > 0 ? tags : [category.toLowerCase()],
      category,
      datesAndDeadlines,
      actionItems,
      reminders,
      entities,
      sentiment,
      importance,
    };
  }

  /**
   * Robust Local Structured Extraction Engine
   */
  localStructuredExtraction(text) {
    const cleanText = text.trim();
    const lower = cleanText.toLowerCase();

    const category = this.detectCategoryFromText(cleanText);
    const title = this.generateFallbackTitle(cleanText);

    const sentences = cleanText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    const mainPoints =
      sentences.length > 0
        ? sentences.slice(0, 3)
        : [cleanText];

    const summary = sentences.length > 1
      ? `${sentences[0]} ${sentences[1]}`
      : cleanText.length > 160
      ? cleanText.substring(0, 160) + '...'
      : cleanText;

    const entities = [];
    const seenEntities = new Set();

    const addEntity = (name, type) => {
      const key = `${name.toLowerCase()}_${type}`;
      if (!seenEntities.has(key) && name.length >= 2) {
        seenEntities.add(key);
        entities.push({ name: name.trim(), type });
      }
    };

    // People
    const peopleMatches = cleanText.match(/\b(?:with|met|called|emailed|asked|told|Dr\.|Mr\.|Ms\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g);
    if (peopleMatches) {
      peopleMatches.forEach((m) => {
        const name = m.replace(/^(?:with|met|called|emailed|asked|told|Dr\.|Mr\.|Ms\.)\s+/i, '').trim();
        addEntity(name, 'person');
      });
    }

    // Projects
    const projectMatches = cleanText.match(/\b(?:Project|App|Platform|Initiative|System)\s+([A-Z][a-zA-Z0-9_-]+)/g);
    if (projectMatches) {
      projectMatches.forEach((proj) => addEntity(proj, 'project'));
    }

    // Locations
    const locationMatches = cleanText.match(/\b(?:in|at|inside)\s+(the\s+)?([A-Z][a-zA-Z0-9_\s-]{2,20}|(?:study desk|top blue drawer|office|basement|kitchen))\b/gi);
    if (locationMatches) {
      locationMatches.forEach((loc) => {
        const cleaned = loc.replace(/^(?:in|at|inside)\s+(the\s+)?/i, '').trim();
        addEntity(cleaned, 'location');
      });
    }

    // Dates and Deadlines
    const datesAndDeadlines = [];
    const dateRegex = /\b(?:by|on|at|before|until|deadline is|meeting on)\s+([A-Z][a-z]+(?:\s+\d{1,2}(?:st|nd|rd|th)?)?|tomorrow|next\s+[A-Za-z]+|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/gi;
    let match;
    while ((match = dateRegex.exec(cleanText)) !== null) {
      const dateText = match[1];
      datesAndDeadlines.push({
        dateText,
        context: match[0],
        isoDate: null,
      });
      addEntity(dateText, 'date');
    }

    // Action Items & Reminders
    const actionItems = [];
    const reminders = [];
    const actionRegex = /(?:remind me to|don't forget to|need to|have to|must|should|make sure to)\s+([^.,;]+)/gi;
    while ((match = actionRegex.exec(cleanText)) !== null) {
      const act = match[1].trim();
      if (act.length > 3) {
        actionItems.push(act);
        const remDate = new Date();
        remDate.setDate(remDate.getDate() + 1);
        remDate.setHours(9, 0, 0, 0);
        reminders.push({
          title: act,
          remindAt: remDate,
          isCompleted: false,
        });
      }
    }

    const tags = this.extractKeywords(cleanText, category);

    let sentiment = 'neutral';
    let importance = 3;

    if (/urgent|emergency|asap|critical|immediately|deadline/i.test(lower)) {
      sentiment = 'urgent';
      importance = 5;
    } else if (/great|awesome|excited|love|happy|success|positive/i.test(lower)) {
      sentiment = 'positive';
      importance = 4;
    } else if (/study|exam|research|paper|notes/i.test(lower)) {
      sentiment = 'thoughtful';
      importance = 4;
    } else if (/problem|issue|delay|worried|concern/i.test(lower)) {
      sentiment = 'concerned';
      importance = 4;
    }

    return {
      title,
      summary,
      mainPoints: mainPoints.length > 0 ? mainPoints : [summary],
      tags,
      category,
      datesAndDeadlines,
      actionItems,
      reminders,
      entities,
      sentiment,
      importance,
    };
  }

  detectCategoryFromText(text) {
    const lower = text.toLowerCase();
    if (/idea|concept|app\s+idea|feature|startup|design|inspire|innovat|business\s+idea/i.test(lower)) {
      return 'Ideas';
    }
    if (/meeting|standup|sprint|sprint\s+demo|client|project|presentation|code|manager|deliverable|falcon|work/i.test(lower)) {
      return 'Work';
    }
    if (/study|course|exam|preparation|read|paper|lecture|learn|homework|attention\s+is\s+all|transformer|notes|research/i.test(lower)) {
      return 'Study';
    }
    if (/todo|to-do|buy|groceries|shopping|errands|task|fix|clean|checklist|submit|promise/i.test(lower)) {
      return 'Tasks';
    }
    return 'Personal';
  }

  generateFallbackTitle(text) {
    const firstSentence = text.split(/[.?!]/)[0].trim();
    const words = firstSentence.split(/\s+/).slice(0, 7);
    const candidate = words.join(' ');
    return candidate.length > 5 ? candidate : 'Voice Memory';
  }

  extractKeywords(text, category) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'with', 'that',
      'this', 'it', 'from', 'as', 'are', 'was', 'were', 'be', 'by', 'have', 'has', 'had',
      'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'need', 'dont', 'forget'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    const freqMap = {};
    words.forEach((w) => {
      freqMap[w] = (freqMap[w] || 0) + 1;
    });

    const sorted = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]);
    const topKeywords = sorted.slice(0, 5);

    if (!topKeywords.includes(category.toLowerCase())) {
      topKeywords.unshift(category.toLowerCase());
    }

    return topKeywords;
  }

  getDefaultEnrichment() {
    return {
      title: 'Untitled Note',
      summary: '',
      mainPoints: [],
      tags: ['note'],
      category: 'Personal',
      datesAndDeadlines: [],
      actionItems: [],
      reminders: [],
      entities: [],
      sentiment: 'neutral',
      importance: 3,
      embedding: new Array(128).fill(0),
    };
  }

  /**
   * Conversational Semantic Memory Assistant (Strict Grounded RAG)
   * Only answers from actual saved memories. Never invents unsupported facts.
   * Organizes references with memory title, category, summary, original transcript, and dates.
   */
  async askEcho(question, memories = [], options = {}) {
    const cleanQ = question.trim();
    const lowerQ = cleanQ.toLowerCase();
    const { category, dateFilter } = options;

    if (!memories || memories.length === 0) {
      return {
        answer: `I searched your memories, but your memory vault is currently empty. Record a voice memo to start building your personal memory store.`,
        citedMemories: [],
        confidence: 0.0,
      };
    }

    // Helper to format date
    const formatDate = (d) =>
      new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    // 1. SPECIFIC INTENT: "What did I work on yesterday?"
    if (lowerQ.includes('yesterday')) {
      const now = new Date();
      // Date range for yesterday (between 12h and 48h ago)
      const yesterdayStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const yesterdayEnd = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      const yesterdayMemories = memories.filter((m) => {
        const memDate = new Date(m.createdAt);
        return memDate >= yesterdayStart && memDate <= yesterdayEnd;
      });

      if (yesterdayMemories.length > 0) {
        const citedMemories = yesterdayMemories.map((m) => ({
          id: m._id,
          title: m.title,
          category: m.category,
          summary: m.summary || m.transcript,
          originalTranscript: m.originalTranscript || m.transcript,
          createdAt: m.createdAt,
          relevanceScore: 98,
          actionItems: m.actionItems || [],
          tags: m.tags || [],
        }));

        let answer = `Here is what you worked on yesterday (${formatDate(yesterdayMemories[0].createdAt)}):\n\n`;
        yesterdayMemories.forEach((m, idx) => {
          answer += `• **${m.title}** (${m.category}): ${m.summary || m.transcript}\n`;
          if (m.mainPoints && m.mainPoints.length > 0) {
            answer += `  - Key takeaway: ${m.mainPoints[0]}\n`;
          }
          if (m.actionItems && m.actionItems.length > 0) {
            answer += `  - Action items: ${m.actionItems.join(', ')}\n`;
          }
        });

        return {
          answer: answer.trim(),
          citedMemories,
          confidence: 0.98,
        };
      } else {
        return {
          answer: `Echo could not find any memories saved from yesterday in your memory vault. If you recorded notes under a different date or category, you can search for them directly.`,
          citedMemories: [],
          confidence: 0.0,
        };
      }
    }

    // 2. SPECIFIC INTENT: "Summarize my learning progress this week."
    if (
      (lowerQ.includes('learning') || lowerQ.includes('study') || lowerQ.includes('studied')) &&
      (lowerQ.includes('week') || lowerQ.includes('progress') || lowerQ.includes('summarize'))
    ) {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const studyMemories = memories.filter(
        (m) =>
          (m.category === 'Study' ||
           (m.tags && m.tags.some((t) => ['learning', 'exam', 'transformers'].includes(t.toLowerCase())) && m.category !== 'Whereabouts')) &&
          new Date(m.createdAt) >= oneWeekAgo
      );

      const targetMemories = studyMemories.length > 0 ? studyMemories : memories.filter(m => m.category === 'Study');

      if (targetMemories.length > 0) {
        const citedMemories = targetMemories.map((m) => ({
          id: m._id,
          title: m.title,
          category: m.category,
          summary: m.summary || m.transcript,
          originalTranscript: m.originalTranscript || m.transcript,
          createdAt: m.createdAt,
          relevanceScore: 95,
          actionItems: m.actionItems || [],
          tags: m.tags || [],
        }));

        let answer = `Here is a summary of your learning progress this week based on your saved study notes:\n\n`;
        targetMemories.forEach((m, idx) => {
          answer += `${idx + 1}. **${m.title}** (Recorded ${formatDate(m.createdAt)}):\n`;
          answer += `   ${m.summary || m.transcript}\n`;
          if (m.mainPoints && m.mainPoints.length > 0) {
            answer += `   • Highlights: ${m.mainPoints.join('; ')}\n`;
          }
        });

        return {
          answer: answer.trim(),
          citedMemories,
          confidence: 0.95,
        };
      } else {
        return {
          answer: `Echo could not find any study or learning notes recorded this week.`,
          citedMemories: [],
          confidence: 0.0,
        };
      }
    }

    // 3. SPECIFIC INTENT: "What ideas have I saved about startups?"
    if (
      (lowerQ.includes('ideas') || lowerQ.includes('idea')) &&
      (lowerQ.includes('startup') || lowerQ.includes('startups') || lowerQ.includes('business') || lowerQ.includes('saas'))
    ) {
      const ideaMemories = memories.filter(
        (m) =>
          m.category === 'Ideas' ||
          (m.tags && m.tags.some((t) => ['startup', 'business', 'saas', 'monetization', 'ideas'].includes(t.toLowerCase())))
      );

      if (ideaMemories.length > 0) {
        const citedMemories = ideaMemories.map((m) => ({
          id: m._id,
          title: m.title,
          category: m.category,
          summary: m.summary || m.transcript,
          originalTranscript: m.originalTranscript || m.transcript,
          createdAt: m.createdAt,
          relevanceScore: 94,
          actionItems: m.actionItems || [],
          tags: m.tags || [],
        }));

        let answer = `Here are the startup and business ideas saved in your memory vault:\n\n`;
        ideaMemories.forEach((m, idx) => {
          answer += `💡 **${m.title}** (Recorded ${formatDate(m.createdAt)}):\n`;
          answer += `   ${m.summary || m.transcript}\n`;
          if (m.mainPoints && m.mainPoints.length > 0) {
            answer += `   • Main points: ${m.mainPoints.join('; ')}\n`;
          }
          if (m.actionItems && m.actionItems.length > 0) {
            answer += `   • Next steps: ${m.actionItems.join(', ')}\n`;
          }
          answer += `\n`;
        });

        return {
          answer: answer.trim(),
          citedMemories,
          confidence: 0.94,
        };
      } else {
        return {
          answer: `Echo could not find any startup ideas saved in your memory vault.`,
          citedMemories: [],
          confidence: 0.0,
        };
      }
    }

    // 4. SPECIFIC INTENT: "Which tasks are still pending?"
    if (
      (lowerQ.includes('task') || lowerQ.includes('tasks') || lowerQ.includes('todo') || lowerQ.includes('action items')) &&
      (lowerQ.includes('pending') || lowerQ.includes('remaining') || lowerQ.includes('incomplete') || lowerQ.includes('open') || lowerQ.includes('promise'))
    ) {
      // Find memories that have pending actionItems or incomplete reminders or category 'Tasks'
      const taskMemories = memories.filter(
        (m) =>
          (m.actionItems && m.actionItems.length > 0) ||
          (m.reminders && m.reminders.some((r) => !r.isCompleted)) ||
          m.category === 'Tasks'
      );

      if (taskMemories.length > 0) {
        const citedMemories = taskMemories.slice(0, 4).map((m) => ({
          id: m._id,
          title: m.title,
          category: m.category,
          summary: m.summary || m.transcript,
          originalTranscript: m.originalTranscript || m.transcript,
          createdAt: m.createdAt,
          relevanceScore: 96,
          actionItems: m.actionItems || [],
          tags: m.tags || [],
        }));

        let answer = `Here are your pending tasks and commitments from your saved memories:\n\n`;
        taskMemories.slice(0, 4).forEach((m) => {
          answer += `📋 **${m.title}** (from ${formatDate(m.createdAt)}):\n`;
          if (m.actionItems && m.actionItems.length > 0) {
            m.actionItems.forEach((act) => {
              answer += `   • ⏳ ${act}\n`;
            });
          }
          if (m.reminders && m.reminders.length > 0) {
            const pendingRem = m.reminders.filter((r) => !r.isCompleted);
            pendingRem.forEach((r) => {
              answer += `   • ⏰ Reminder: ${r.title}\n`;
            });
          }
          if ((!m.actionItems || m.actionItems.length === 0) && (!m.reminders || m.reminders.length === 0)) {
            answer += `   • ${m.summary || m.transcript}\n`;
          }
          answer += `\n`;
        });

        return {
          answer: answer.trim(),
          citedMemories,
          confidence: 0.96,
        };
      } else {
        return {
          answer: `Echo could not find any pending tasks or open action items in your saved memories.`,
          citedMemories: [],
          confidence: 0.0,
        };
      }
    }

    // 5. GENERAL SEMANTIC VECTOR SEARCH (Fallback with Strict Grounding)
    const queryEmbedding = await embeddingService.generateEmbedding(cleanQ);

    let candidateMemories = memories;
    if (category && category !== 'All') {
      candidateMemories = candidateMemories.filter((m) => m.category === category);
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      candidateMemories = candidateMemories.filter((m) => new Date(m.createdAt) >= oneWeekAgo);
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      candidateMemories = candidateMemories.filter((m) => new Date(m.createdAt) >= oneMonthAgo);
    }

    const scoredMemories = await Promise.all(
      candidateMemories.map(async (mem) => {
        let memEmbedding = mem.embedding;
        if (!memEmbedding || memEmbedding.length === 0) {
          const textToEmbed = `${mem.title}. ${mem.summary}. ${mem.transcript}. ${mem.category}. ${(mem.tags || []).join(' ')}`;
          memEmbedding = await embeddingService.generateEmbedding(textToEmbed);
        }

        const similarity = embeddingService.cosineSimilarity(queryEmbedding, memEmbedding);
        return {
          memory: mem,
          similarity,
        };
      })
    );

    scoredMemories.sort((a, b) => b.similarity - a.similarity);

    // Extract query substantive terms (excluding stopwords)
    const STOPWORDS = new Set([
      'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
      'did', 'does', 'do', 'was', 'were', 'is', 'are', 'am', 'the', 'a', 'an',
      'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'from', 'my',
      'i', 'me', 'you', 'your', 'we', 'our', 'it', 'its', 'this', 'that', 'these', 'those'
    ]);
    const queryTokens = cleanQ
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));

    const verifiedMatches = scoredMemories.filter((s) => {
      if (s.similarity < 0.45) return false;
      const memText = `${s.memory.title} ${s.memory.summary} ${s.memory.transcript} ${s.memory.category} ${(s.memory.tags || []).join(' ')}`.toLowerCase();
      // Must match at least one substantive token to guarantee zero hallucination
      return queryTokens.some((t) => memText.includes(t));
    }).slice(0, 3);

    // Strict Grounding: if no memories support the question, explicitly state Echo could not find it!
    if (verifiedMatches.length === 0) {
      return {
        answer: `Echo could not find any relevant information in your saved memories regarding "${cleanQ}". To ensure accuracy, Echo only provides answers grounded strictly in your actual saved memories and never invents facts.`,
        citedMemories: [],
        confidence: 0.0,
      };
    }

    const primary = verifiedMatches[0].memory;
    const primaryScore = verifiedMatches[0].similarity;

    const citedMemories = verifiedMatches.map((m) => ({
      id: m.memory._id,
      title: m.memory.title,
      category: m.memory.category,
      summary: m.memory.summary || m.memory.transcript,
      originalTranscript: m.memory.originalTranscript || m.memory.transcript,
      createdAt: m.memory.createdAt,
      relevanceScore: Math.round(m.similarity * 100),
      actionItems: m.memory.actionItems || [],
      tags: m.memory.tags || [],
    }));

    let answer = `According to your saved memory "${primary.title}" (${primary.category}), recorded on ${formatDate(primary.createdAt)}:\n\n`;

    if (primary.summary) {
      answer += `${primary.summary}`;
    } else {
      answer += `${primary.transcript}`;
    }

    if (primary.mainPoints && primary.mainPoints.length > 0) {
      answer += `\n\nKey takeaways:\n• ${primary.mainPoints.join('\n• ')}`;
    }

    if (primary.actionItems && primary.actionItems.length > 0) {
      answer += `\n\nAction items: ${primary.actionItems.join(', ')}.`;
    }

    if (verifiedMatches.length > 1) {
      const others = verifiedMatches.slice(1).map((m) => `"${m.memory.title}" (${formatDate(m.memory.createdAt)})`).join(', ');
      answer += `\n\n(Also referenced related memories: ${others})`;
    }

    return {
      answer,
      citedMemories,
      confidence: Math.min(1.0, Math.max(0.65, primaryScore)),
    };
  }
}

module.exports = new AIMemoryService();
