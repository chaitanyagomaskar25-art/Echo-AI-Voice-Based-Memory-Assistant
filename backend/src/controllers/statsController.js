const Memory = require('../models/Memory');

// Get high-level memory analytics
exports.getStats = async (req, res, next) => {
  try {
    const totalMemories = await Memory.countDocuments();
    const pinnedCount = await Memory.countDocuments({ isPinned: true });

    // Category breakdown
    const categoryCounts = await Memory.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Sentiment breakdown
    const sentimentCounts = await Memory.aggregate([
      { $group: { _id: '$sentiment', count: { $sum: 1 } } },
    ]);

    // Pending reminders
    const memoriesWithReminders = await Memory.find({
      'reminders.isCompleted': false,
    }).select('title reminders category createdAt');

    const pendingReminders = [];
    memoriesWithReminders.forEach((mem) => {
      mem.reminders.forEach((rem) => {
        if (!rem.isCompleted) {
          pendingReminders.push({
            memoryId: mem._id,
            memoryTitle: mem.title,
            category: mem.category,
            reminderId: rem._id,
            title: rem.title,
            remindAt: rem.remindAt,
          });
        }
      });
    });

    // Recent 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivityCount = await Memory.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.json({
      success: true,
      data: {
        totalMemories,
        pinnedCount,
        recentActivityCount,
        categoryBreakdown: categoryCounts.map((c) => ({ category: c._id, count: c.count })),
        sentimentBreakdown: sentimentCounts.map((s) => ({ sentiment: s._id, count: s.count })),
        pendingReminders,
      },
    });
  } catch (error) {
    next(error);
  }
};
