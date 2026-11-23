/**
 * AI Task Extraction Utility for Echo Voice Transcripts
 *
 * Automatically identifies actionable tasks from voice transcripts.
 * Extracts:
 * - title
 * - description
 * - dueDate (ONLY if explicitly mentioned; NEVER invents deadlines)
 * - dueDateText (raw text snippet from transcript)
 * - hasAmbiguousDate (true if vague like "sometime next week", "soon")
 * - dateConfirmed (false if ambiguous, requiring user confirmation)
 * - priority ('urgent', 'high', 'medium', 'low')
 * - category
 */

// Common day names for relative calculation
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Parses explicit vs ambiguous dates mentioned in a phrase.
 * STRICT RULE: Never invent deadlines. If not explicitly mentioned, return null.
 */
function parseDateMention(text) {
  if (!text) return { dueDate: null, dueDateText: '', hasAmbiguousDate: false, dateConfirmed: true };

  const lower = text.toLowerCase();

  // 1. Detect AMBIGUOUS date phrases (requires user confirmation before scheduling)
  const ambiguousPatterns = [
    /sometime\s+next\s+week/i,
    /sometime\s+soon/i,
    /later\s+this\s+week/i,
    /later\s+this\s+month/i,
    /in\s+a\s+few\s+days/i,
    /in\s+a\s+couple\s+(?:of\s+)?days/i,
    /\bsoon\b/i,
    /\blater\b/i,
    /one\s+of\s+these\s+days/i,
    /eventually/i,
  ];

  for (const pattern of ambiguousPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        dueDate: null,
        dueDateText: match[0],
        hasAmbiguousDate: true,
        dateConfirmed: false, // Prompt user to confirm!
      };
    }
  }

  const now = new Date();

  // 2. Detect EXPLICIT date phrases
  // Tomorrow
  if (/\btomorrow\b/i.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    // check if time mentioned e.g. 3 pm
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const isPm = timeMatch[3].toLowerCase() === 'pm';
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
      d.setHours(hours, mins, 0, 0);
    } else {
      d.setHours(17, 0, 0, 0); // default 5 PM if day only
    }
    return {
      dueDate: d,
      dueDateText: 'tomorrow',
      hasAmbiguousDate: false,
      dateConfirmed: true,
    };
  }

  // "by Friday" / "next Tuesday" / "on Wednesday"
  const dayMatch = lower.match(/\b(?:by|on|before|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (dayMatch) {
    const targetDayName = dayMatch[1].toLowerCase();
    const targetDayIndex = DAYS.indexOf(targetDayName);
    const currentDayIndex = now.getDay();

    let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // next week's occurrence

    const d = new Date(now);
    d.setDate(d.getDate() + daysToAdd);

    if (dayMatch[2]) {
      let hours = parseInt(dayMatch[2], 10);
      const mins = dayMatch[3] ? parseInt(dayMatch[3], 10) : 0;
      const ampm = dayMatch[4]?.toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      d.setHours(hours, mins, 0, 0);
    } else {
      d.setHours(17, 0, 0, 0); // 5:00 PM default for explicit day
    }

    return {
      dueDate: d,
      dueDateText: dayMatch[0],
      hasAmbiguousDate: false,
      dateConfirmed: true,
    };
  }

  // Explicit month & day (e.g., "Nov 25", "November 28th", "December 1")
  const monthDayMatch = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?/i);
  if (monthDayMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.indexOf(monthDayMatch[1].toLowerCase().slice(0, 3));
    const dayNum = parseInt(monthDayMatch[2], 10);
    const d = new Date(now.getFullYear(), monthIndex, dayNum, 17, 0, 0);
    if (d < now) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return {
      dueDate: d,
      dueDateText: monthDayMatch[0],
      hasAmbiguousDate: false,
      dateConfirmed: true,
    };
  }

  // If no date was explicitly mentioned, return null (never invent deadlines)
  return {
    dueDate: null,
    dueDateText: '',
    hasAmbiguousDate: false,
    dateConfirmed: true,
  };
}

/**
 * Detect priority based on urgency cues
 */
function detectPriority(text) {
  const lower = text.toLowerCase();
  if (/\b(asap|urgent|immediately|emergency|critical|today|highest priority)\b/i.test(lower)) {
    return 'urgent';
  }
  if (/\b(must|deadline|important|crucial|needed|promise|promised|high priority)\b/i.test(lower)) {
    return 'high';
  }
  if (/\b(low priority|whenever|optional|eventually|if possible|minor)\b/i.test(lower)) {
    return 'low';
  }
  return 'medium';
}

/**
 * Extracts clean, actionable tasks from a voice transcript.
 */
function extractTasksFromTranscript(transcript, options = {}) {
  const { memoryId = null, category = 'Tasks' } = options;
  if (!transcript || typeof transcript !== 'string') return [];

  const tasks = [];
  const cleanText = transcript.trim();

  // Regex patterns to identify actionable sentences/clauses
  const actionPatterns = [
    /(?:remind me to|don't forget to|need to|have to|must|should|make sure to|action item:|tasks to complete:|tasks I promised to complete:)\s+([^.\n;]+)/gi,
    /(?:plan to|scheduled to|will follow up with|finalize|submit|deliver|review)\s+([^.\n;]+)/gi,
  ];

  const seenTitles = new Set();

  for (const pattern of actionPatterns) {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const rawClause = match[1].trim();
      if (rawClause.length < 5) continue;

      // Clean up punctuation and conjunctions
      const titleCandidate = rawClause
        .replace(/^(and\s+|also\s+|then\s+)/i, '')
        .replace(/[.,;]+$/, '')
        .trim();

      // Format capital first letter
      const formattedTitle = titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);
      const titleKey = formattedTitle.toLowerCase();

      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey);

        const dateInfo = parseDateMention(rawClause);
        const priority = detectPriority(rawClause);

        tasks.push({
          title: formattedTitle,
          description: `Extracted from voice memo: "${cleanText.substring(0, 140)}..."`,
          dueDate: dateInfo.dueDate,
          dueDateText: dateInfo.dueDateText,
          hasAmbiguousDate: dateInfo.hasAmbiguousDate,
          dateConfirmed: dateInfo.dateConfirmed,
          priority,
          status: dateInfo.dueDate && dateInfo.dueDate < new Date() ? 'overdue' : 'pending',
          isCompleted: false,
          memory: memoryId,
          category,
        });
      }
    }
  }

  // If no regex match found, but transcript is clearly a to-do/task note
  if (tasks.length === 0 && (category === 'Tasks' || /buy|call|clean|fix|finish|email|write|send/i.test(cleanText))) {
    const firstSentence = cleanText.split(/[.\n]/)[0].trim();
    if (firstSentence.length > 5) {
      const dateInfo = parseDateMention(firstSentence);
      tasks.push({
        title: firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1),
        description: `Voice note: "${cleanText}"`,
        dueDate: dateInfo.dueDate,
        dueDateText: dateInfo.dueDateText,
        hasAmbiguousDate: dateInfo.hasAmbiguousDate,
        dateConfirmed: dateInfo.dateConfirmed,
        priority: detectPriority(firstSentence),
        status: dateInfo.dueDate && dateInfo.dueDate < new Date() ? 'overdue' : 'pending',
        isCompleted: false,
        memory: memoryId,
        category,
      });
    }
  }

  return tasks;
}

module.exports = {
  parseDateMention,
  detectPriority,
  extractTasksFromTranscript,
};
