/**
 * AI Memory Recap Service
 * Generates and caches daily and weekly memory recaps summarizing:
 * - Important things learned
 * - Ideas captured
 * - Work completed
 * - Tasks pending
 * - Upcoming deadlines
 * - Important decisions
 *
 * Grounded strictly in the user's real saved memories and tasks.
 * Caches results in MongoDB to avoid redundant AI calls.
 */

const Memory = require('../models/Memory');
const Task = require('../models/Task');
const Recap = require('../models/Recap');

class RecapService {
  /**
   * Parse date bounds for daily or weekly periods
   */
  getPeriodBounds(type, targetDate = new Date()) {
    const date = new Date(targetDate);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid target date provided');
    }

    if (type === 'weekly') {
      // Find start of week (Monday 00:00:00)
      const day = date.getDay();
      const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(date);
      start.setDate(diffToMonday);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      // Week label: "Nov 17 - Nov 23, 2026"
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const periodLabel = `${startStr} – ${endStr}`;

      const year = start.getFullYear();
      const oneJan = new Date(year, 0, 1);
      const numberOfDays = Math.floor((start - oneJan) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((start.getDay() + 1 + numberOfDays) / 7);
      const dateKey = `weekly_${year}_W${String(weekNumber).padStart(2, '0')}_${start.toISOString().split('T')[0]}`;

      return { periodStart: start, periodEnd: end, dateKey, periodLabel };
    } else {
      // Daily period
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const dateStr = start.toISOString().split('T')[0];
      const dateKey = `daily_${dateStr}`;
      const periodLabel = start.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return { periodStart: start, periodEnd: end, dateKey, periodLabel };
    }
  }

  /**
   * Retrieve cached recap or generate a new one if stale / requested
   */
  async getOrGenerateRecap({ type = 'daily', date = new Date(), forceRefresh = false, userId = null }) {
    const { periodStart, periodEnd, dateKey, periodLabel } = this.getPeriodBounds(type, date);

    // 1. Check existing cached recap
    const query = { type, dateKey };
    if (userId) query.user = userId;
    else query.user = null;

    const cachedRecap = await Recap.findOne(query);

    // Find the latest updatedAt among memories in this period
    const memQuery = {
      createdAt: { $gte: periodStart, $lte: periodEnd },
    };
    if (userId) memQuery.user = userId;

    const latestMemory = await Memory.findOne(memQuery).sort({ updatedAt: -1 }).select('updatedAt');
    const latestTask = await Task.findOne({
      $or: [
        { createdAt: { $gte: periodStart, $lte: periodEnd } },
        { updatedAt: { $gte: periodStart, $lte: periodEnd } },
      ],
    })
      .sort({ updatedAt: -1 })
      .select('updatedAt');

    const latestPeriodChange = Math.max(
      latestMemory ? new Date(latestMemory.updatedAt).getTime() : 0,
      latestTask ? new Date(latestTask.updatedAt).getTime() : 0
    );

    // If cached and valid (no new memories/tasks after generatedAt), return cache!
    if (!forceRefresh && cachedRecap) {
      const generatedAtTime = new Date(cachedRecap.generatedAt).getTime();
      if (latestPeriodChange <= generatedAtTime) {
        return {
          recap: cachedRecap,
          isCached: true,
          cachedAt: cachedRecap.generatedAt,
        };
      }
    }

    // 2. Cache miss or invalidated -> Generate fresh recap
    const memories = await Memory.find(memQuery).sort({ createdAt: 1 });

    // Fetch related tasks
    const taskQuery = {
      $or: [
        { createdAt: { $gte: periodStart, $lte: periodEnd } },
        { updatedAt: { $gte: periodStart, $lte: periodEnd } },
        { dueDate: { $gte: periodStart, $lte: periodEnd } },
      ],
    };
    if (userId) taskQuery.user = userId;
    const periodTasks = await Task.find(taskQuery).populate('memory', 'title').sort({ dueDate: 1 });

    // Also fetch all pending tasks for the user
    const pendingTasksQuery = { isCompleted: false };
    if (userId) pendingTasksQuery.user = userId;
    const allPendingTasks = await Task.find(pendingTasksQuery)
      .populate('memory', 'title')
      .sort({ priority: -1, dueDate: 1 })
      .limit(10);

    // Synthesize structured sections without hallucinations
    const sections = this.extractRecapSections(memories, periodTasks, allPendingTasks, periodStart, periodEnd);
    const stats = this.computeRecapStats(memories, periodTasks, allPendingTasks);

    // Generate AI Headline & Overview
    const { headline, overview } = await this.synthesizeAiNarrative(type, periodLabel, memories, sections, stats);

    // Persist or update cached recap in MongoDB
    const recapData = {
      user: userId || null,
      type,
      dateKey,
      periodStart,
      periodEnd,
      periodLabel,
      headline,
      overview,
      sections,
      stats,
      sourceMemories: memories.map((m) => m._id),
      generatedAt: new Date(),
      lastMemoryUpdatedAt: latestPeriodChange ? new Date(latestPeriodChange) : new Date(),
      isAiGenerated: true,
    };

    const savedRecap = await Recap.findOneAndUpdate(query, recapData, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return {
      recap: savedRecap,
      isCached: false,
      generatedAt: savedRecap.generatedAt,
    };
  }

  /**
   * Deterministically extracts facts from actual memories and tasks into 6 required categories
   */
  extractRecapSections(memories, periodTasks, allPendingTasks, periodStart, periodEnd) {
    const seenTexts = new Set();
    const isDuplicate = (text) => {
      const clean = (text || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!clean || seenTexts.has(clean)) return true;
      seenTexts.add(clean);
      return false;
    };

    const thingsLearned = [];
    const ideasCaptured = [];
    const workCompleted = [];
    const tasksPending = [];
    const upcomingDeadlines = [];
    const importantDecisions = [];

    // Decision keywords
    const decisionKeywords = ['decided', 'agreed', 'chose', 'chosen', 'finalized', 'concluded', 'resolution', 'selected', 'plan is to'];

    // 1. Process Memories
    for (const mem of memories) {
      const memId = mem._id;
      const memTitle = mem.title;
      const category = mem.category;

      // Extract Ideas
      if (category === 'Ideas') {
        if (!isDuplicate(mem.title)) {
          ideasCaptured.push({
            text: mem.summary || mem.title,
            memoryId: memId,
            memoryTitle: memTitle,
            category: 'Ideas',
          });
        }
        if (Array.isArray(mem.mainPoints)) {
          for (const pt of mem.mainPoints) {
            if (!isDuplicate(pt)) {
              ideasCaptured.push({
                text: pt,
                memoryId: memId,
                memoryTitle: memTitle,
                category: 'Ideas',
              });
            }
          }
        }
      }

      // Extract Things Learned (Study category or learning tags/content)
      if (
        category === 'Study' ||
        (mem.tags && mem.tags.some((t) => ['study', 'learning', 'research', 'concept', 'notes', 'exam'].includes(t.toLowerCase())))
      ) {
        if (!isDuplicate(mem.title)) {
          thingsLearned.push({
            text: mem.summary || mem.title,
            memoryId: memId,
            memoryTitle: memTitle,
            category: 'Study',
          });
        }
        if (Array.isArray(mem.mainPoints)) {
          for (const pt of mem.mainPoints) {
            if (!isDuplicate(pt)) {
              thingsLearned.push({
                text: pt,
                memoryId: memId,
                memoryTitle: memTitle,
                category: 'Study',
              });
            }
          }
        }
      }

      // Extract Work Completed (from Work category notes)
      if (category === 'Work') {
        const textToUse = mem.summary || mem.title;
        if (!isDuplicate(textToUse)) {
          workCompleted.push({
            text: textToUse,
            memoryId: memId,
            memoryTitle: memTitle,
            category: 'Work',
          });
        }
        if (Array.isArray(mem.mainPoints)) {
          for (const pt of mem.mainPoints) {
            if (!isDuplicate(pt)) {
              workCompleted.push({
                text: pt,
                memoryId: memId,
                memoryTitle: memTitle,
                category: 'Work',
              });
            }
          }
        }
      }

      // Extract Decisions (from all categories if decision indicators match)
      const fullContent = `${mem.title} ${mem.summary} ${(mem.mainPoints || []).join(' ')} ${mem.transcript}`;
      const lowerContent = fullContent.toLowerCase();
      const hasDecision = decisionKeywords.some((kw) => lowerContent.includes(kw));

      if (hasDecision) {
        // Find specific sentence or main point containing decision
        const matchedPoint = (mem.mainPoints || []).find((p) =>
          decisionKeywords.some((kw) => p.toLowerCase().includes(kw))
        );
        const decisionText = matchedPoint || mem.summary || `Decided: ${mem.title}`;
        if (!isDuplicate(decisionText)) {
          importantDecisions.push({
            text: decisionText,
            memoryId: memId,
            memoryTitle: memTitle,
            category: mem.category,
          });
        }
      }

      // Extract Upcoming Deadlines from memory metadata
      if (Array.isArray(mem.datesAndDeadlines)) {
        for (const dd of mem.datesAndDeadlines) {
          const deadlineText = dd.context ? `${dd.dateText} — ${dd.context}` : dd.dateText;
          if (deadlineText && !isDuplicate(deadlineText)) {
            upcomingDeadlines.push({
              text: deadlineText,
              dateText: dd.dateText,
              dueDate: dd.isoDate || null,
              memoryId: memId,
              memoryTitle: memTitle,
            });
          }
        }
      }
    }

    // 2. Process Tasks: Completed Tasks into Work Completed
    for (const task of periodTasks) {
      if (task.isCompleted) {
        const taskText = `Completed task: ${task.title}`;
        if (!isDuplicate(taskText)) {
          workCompleted.push({
            text: task.title,
            taskId: task._id,
            memoryId: task.memory ? (task.memory._id || task.memory) : null,
            memoryTitle: task.memory?.title || '',
            category: task.category || 'Tasks',
          });
        }
      }
    }

    // 3. Process Pending Tasks
    for (const task of allPendingTasks) {
      const taskKey = `pending_${task._id}`;
      if (!seenTexts.has(taskKey)) {
        seenTexts.add(taskKey);
        tasksPending.push({
          text: task.title,
          taskId: task._id,
          title: task.title,
          priority: task.priority || 'medium',
          dueDate: task.dueDate || null,
          memoryId: task.memory ? (task.memory._id || task.memory) : null,
          memoryTitle: task.memory?.title || '',
          category: task.category || 'Tasks',
        });
      }

      // If pending task has a due date in the near future, add to upcoming deadlines
      if (task.dueDate) {
        const deadlineLabel = `Task deadline: ${task.title} (Due: ${new Date(task.dueDate).toLocaleDateString()})`;
        if (!isDuplicate(deadlineLabel)) {
          upcomingDeadlines.push({
            text: deadlineLabel,
            dateText: new Date(task.dueDate).toLocaleDateString(),
            dueDate: task.dueDate,
            taskId: task._id,
            memoryId: task.memory ? (task.memory._id || task.memory) : null,
            memoryTitle: task.memory?.title || '',
          });
        }
      }
    }

    return {
      thingsLearned,
      ideasCaptured,
      workCompleted,
      tasksPending,
      upcomingDeadlines,
      importantDecisions,
    };
  }

  /**
   * Computes summary metrics
   */
  computeRecapStats(memories, periodTasks, allPendingTasks) {
    const categoryCounts = {};
    for (const m of memories) {
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    }

    const completedTasksCount = periodTasks.filter((t) => t.isCompleted).length;
    const pendingTasksCount = allPendingTasks.length;

    return {
      totalMemories: memories.length,
      totalTasks: periodTasks.length,
      completedTasksCount,
      pendingTasksCount,
      categoryCounts,
    };
  }

  /**
   * Synthesize AI Executive Headline and Conversational Overview
   */
  async synthesizeAiNarrative(type, periodLabel, memories, sections, stats) {
    if (memories.length === 0 && stats.completedTasksCount === 0 && stats.pendingTasksCount === 0) {
      return {
        headline: `No memories recorded for this ${type === 'weekly' ? 'week' : 'day'}`,
        overview: `You didn't record any voice notes or complete tasks during this period. Tap Record to start capturing your thoughts!`,
      };
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    // Build context summary for LLM
    const contextPrompt = `Period: ${periodLabel} (${type})
Total Memories Captured: ${stats.totalMemories}
Key Categories: ${Object.entries(stats.categoryCounts).map(([cat, cnt]) => `${cat}: ${cnt}`).join(', ') || 'None'}
Ideas Captured (${sections.ideasCaptured.length}): ${sections.ideasCaptured.map((i) => i.text).slice(0, 3).join('; ') || 'None'}
Things Learned (${sections.thingsLearned.length}): ${sections.thingsLearned.map((l) => l.text).slice(0, 3).join('; ') || 'None'}
Work Completed (${sections.workCompleted.length}): ${sections.workCompleted.map((w) => w.text).slice(0, 3).join('; ') || 'None'}
Decisions Made (${sections.importantDecisions.length}): ${sections.importantDecisions.map((d) => d.text).slice(0, 3).join('; ') || 'None'}
Pending Tasks: ${stats.pendingTasksCount}
Upcoming Deadlines: ${sections.upcomingDeadlines.length}`;

    // If OpenAI API key is present
    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are Echo, a premium personal AI voice memory assistant. Given the structured summary of the user\'s real captured memories and tasks for a period, write a crisp 1-sentence headline (max 10 words) and a 2-sentence conversational recap overview highlighting their accomplishments, ideas, and focus. Return JSON: { "headline": "...", "overview": "..." }',
              },
              { role: 'user', content: contextPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.choices[0]?.message?.content);
          if (parsed.headline && parsed.overview) {
            return {
              headline: parsed.headline.trim(),
              overview: parsed.overview.trim(),
            };
          }
        }
      } catch (err) {
        console.warn(`[RecapService] OpenAI call notice: ${err.message}. Using cognitive generator.`);
      }
    }

    // High-precision local cognitive narrative generator
    const topCategories = Object.keys(stats.categoryCounts).sort(
      (a, b) => stats.categoryCounts[b] - stats.categoryCounts[a]
    );
    const primaryFocus = topCategories[0] || 'Personal';

    let headline = '';
    if (type === 'weekly') {
      headline = `${stats.totalMemories} memories captured • Strong focus on ${primaryFocus}`;
    } else {
      headline = `${stats.totalMemories} memories recorded • ${stats.pendingTasksCount} tasks pending`;
    }

    let overviewParts = [];
    if (sections.workCompleted.length > 0) {
      overviewParts.push(`You completed work on ${sections.workCompleted[0].text}`);
    }
    if (sections.ideasCaptured.length > 0) {
      overviewParts.push(`captured ${sections.ideasCaptured.length} creative idea${sections.ideasCaptured.length > 1 ? 's' : ''}`);
    }
    if (sections.thingsLearned.length > 0) {
      overviewParts.push(`documented new findings in ${sections.thingsLearned[0].text}`);
    }
    if (sections.importantDecisions.length > 0) {
      overviewParts.push(`finalized decisions regarding ${sections.importantDecisions[0].text}`);
    }

    let overview = '';
    if (overviewParts.length > 0) {
      overview = `During this ${type === 'weekly' ? 'week' : 'day'}, ${overviewParts.join(', and ')}. You have ${stats.pendingTasksCount} pending task${stats.pendingTasksCount === 1 ? '' : 's'} to follow up on.`;
    } else {
      overview = `You captured ${stats.totalMemories} voice thought${stats.totalMemories === 1 ? '' : 's'} across ${topCategories.join(', ') || 'various areas'}.`;
    }

    return { headline, overview };
  }

  /**
   * Get date-based history of past recaps and active memory dates
   */
  async getRecapHistory({ type = 'daily', limit = 14, userId = null }) {
    const memQuery = {};
    if (userId) memQuery.user = userId;

    if (type === 'weekly') {
      // Find distinct weeks
      const recentMemories = await Memory.find(memQuery).sort({ createdAt: -1 }).select('createdAt');
      const weekMap = new Map();

      // Always include current week
      const currentWeek = this.getPeriodBounds('weekly', new Date());
      weekMap.set(currentWeek.dateKey, {
        dateKey: currentWeek.dateKey,
        targetDate: new Date(),
        periodStart: currentWeek.periodStart,
        periodEnd: currentWeek.periodEnd,
        periodLabel: currentWeek.periodLabel,
        memoryCount: 0,
      });

      for (const m of recentMemories) {
        const bounds = this.getPeriodBounds('weekly', m.createdAt);
        if (!weekMap.has(bounds.dateKey)) {
          weekMap.set(bounds.dateKey, {
            dateKey: bounds.dateKey,
            targetDate: m.createdAt,
            periodStart: bounds.periodStart,
            periodEnd: bounds.periodEnd,
            periodLabel: bounds.periodLabel,
            memoryCount: 1,
          });
        } else {
          weekMap.get(bounds.dateKey).memoryCount += 1;
        }
      }

      // Check which weeks have cached recaps
      const dateKeys = Array.from(weekMap.keys());
      const cachedRecaps = await Recap.find({
        type: 'weekly',
        dateKey: { $in: dateKeys },
        ...(userId ? { user: userId } : { user: null }),
      }).select('dateKey headline generatedAt');

      const cachedMap = new Map(cachedRecaps.map((r) => [r.dateKey, r]));

      const history = Array.from(weekMap.values())
        .sort((a, b) => b.periodStart - a.periodStart)
        .slice(0, limit)
        .map((w) => ({
          ...w,
          hasCachedRecap: cachedMap.has(w.dateKey),
          headline: cachedMap.get(w.dateKey)?.headline || '',
          generatedAt: cachedMap.get(w.dateKey)?.generatedAt || null,
        }));

      return history;
    } else {
      // Daily history
      const days = [];
      const now = new Date();

      // Check last 14 days
      for (let i = 0; i < limit; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const bounds = this.getPeriodBounds('daily', d);
        days.push(bounds);
      }

      const dateKeys = days.map((d) => d.dateKey);
      const cachedRecaps = await Recap.find({
        type: 'daily',
        dateKey: { $in: dateKeys },
        ...(userId ? { user: userId } : { user: null }),
      }).select('dateKey headline generatedAt stats');

      const cachedMap = new Map(cachedRecaps.map((r) => [r.dateKey, r]));

      // Count memories per day in batch
      const oldestDay = days[days.length - 1].periodStart;
      const memoriesInRange = await Memory.find({
        ...memQuery,
        createdAt: { $gte: oldestDay },
      }).select('createdAt');

      const dayCountMap = new Map();
      for (const m of memoriesInRange) {
        const bounds = this.getPeriodBounds('daily', m.createdAt);
        dayCountMap.set(bounds.dateKey, (dayCountMap.get(bounds.dateKey) || 0) + 1);
      }

      const history = days.map((day, idx) => {
        const count = dayCountMap.get(day.dateKey) || 0;
        const cached = cachedMap.get(day.dateKey);
        let displayLabel = '';
        if (idx === 0) displayLabel = 'Today';
        else if (idx === 1) displayLabel = 'Yesterday';
        else displayLabel = day.periodStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        return {
          dateKey: day.dateKey,
          targetDate: day.periodStart,
          periodLabel: day.periodLabel,
          displayLabel,
          memoryCount: count,
          hasCachedRecap: !!cached,
          headline: cached?.headline || '',
          generatedAt: cached?.generatedAt || null,
        };
      });

      return history;
    }
  }
}

module.exports = new RecapService();
