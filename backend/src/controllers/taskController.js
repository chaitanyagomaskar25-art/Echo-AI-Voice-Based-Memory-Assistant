const Task = require('../models/Task');
const Memory = require('../models/Memory');
const { extractTasksFromTranscript } = require('../utils/taskExtractor');

// List tasks with section categorization and counts
exports.listTasks = async (req, res, next) => {
  try {
    const { section = 'all', priority, category, memoryId } = req.query;
    const now = new Date();

    const allTasks = await Task.find(memoryId ? { memory: memoryId } : {})
      .populate('memory', 'title category createdAt transcript originalTranscript')
      .sort({ isCompleted: 1, dueDate: 1, createdAt: -1 });

    // Compute dynamic section counts
    let upcomingCount = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let ambiguousCount = 0;

    allTasks.forEach((t) => {
      if (t.hasAmbiguousDate && !t.dateConfirmed) {
        ambiguousCount++;
      }
      if (t.isCompleted) {
        completedCount++;
      } else if (!t.dueDate) {
        pendingCount++;
      } else if (new Date(t.dueDate) < now) {
        overdueCount++;
      } else {
        upcomingCount++;
      }
    });

    // Filter by requested section
    let filtered = allTasks;
    if (section === 'upcoming') {
      filtered = allTasks.filter((t) => !t.isCompleted && t.dueDate && new Date(t.dueDate) >= now);
    } else if (section === 'overdue') {
      filtered = allTasks.filter((t) => !t.isCompleted && t.dueDate && new Date(t.dueDate) < now);
    } else if (section === 'pending') {
      filtered = allTasks.filter((t) => !t.isCompleted && !t.dueDate);
    } else if (section === 'completed') {
      filtered = allTasks.filter((t) => t.isCompleted);
    }

    if (priority) {
      filtered = filtered.filter((t) => t.priority === priority);
    }
    if (category && category !== 'All') {
      filtered = filtered.filter((t) => t.category === category);
    }

    res.json({
      success: true,
      count: filtered.length,
      sections: {
        upcoming: upcomingCount,
        overdue: overdueCount,
        pending: pendingCount,
        completed: completedCount,
        ambiguous: ambiguousCount,
      },
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

// Get single task by ID
exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('memory', 'title category createdAt transcript');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// Manually create a task
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, priority, memoryId, category, remindAt } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const task = new Task({
      title: title.trim(),
      description: description ? description.trim() : '',
      dueDate: dueDate ? new Date(dueDate) : null,
      dueDateText: dueDate ? new Date(dueDate).toLocaleDateString() : '',
      priority: priority || 'medium',
      memory: memoryId || null,
      category: category || 'Tasks',
      remindAt: remindAt ? new Date(remindAt) : null,
      isCompleted: false,
      dateConfirmed: true,
      hasAmbiguousDate: false,
    });

    const saved = await task.save();
    await saved.populate('memory', 'title category createdAt');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// Edit task details
exports.updateTask = async (req, res, next) => {
  try {
    const { title, description, priority, category } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (title && title.trim()) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority) task.priority = priority;
    if (category) task.category = category;

    const saved = await task.save();
    await saved.populate('memory', 'title category createdAt');

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle complete / uncomplete
exports.toggleComplete = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.isCompleted = !task.isCompleted;
    task.completedAt = task.isCompleted ? new Date() : null;
    task.status = task.isCompleted ? 'completed' : task.dueDate && new Date(task.dueDate) < new Date() ? 'overdue' : 'pending';

    const saved = await task.save();
    await saved.populate('memory', 'title category createdAt');

    res.json({
      success: true,
      message: task.isCompleted ? 'Task marked as completed' : 'Task marked as pending',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// Reschedule task deadline
exports.rescheduleTask = async (req, res, next) => {
  try {
    const { dueDate, remindAt } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.dueDate = dueDate ? new Date(dueDate) : null;
    task.dueDateText = dueDate ? new Date(dueDate).toLocaleDateString() : '';
    task.remindAt = remindAt ? new Date(remindAt) : null;
    task.hasAmbiguousDate = false;
    task.dateConfirmed = true;

    const now = new Date();
    if (task.isCompleted) {
      task.status = 'completed';
    } else if (task.dueDate && new Date(task.dueDate) < now) {
      task.status = 'overdue';
    } else if (task.dueDate) {
      task.status = 'upcoming';
    } else {
      task.status = 'pending';
    }

    const saved = await task.save();
    await saved.populate('memory', 'title category createdAt');

    res.json({
      success: true,
      message: dueDate ? 'Task rescheduled successfully' : 'Task deadline removed',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// Confirm ambiguous date with user chosen deadline
exports.confirmAmbiguousDate = async (req, res, next) => {
  try {
    const { confirmedDate, keepWithoutDeadline } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.hasAmbiguousDate = false;
    task.dateConfirmed = true;

    if (keepWithoutDeadline) {
      task.dueDate = null;
      task.status = 'pending';
    } else if (confirmedDate) {
      task.dueDate = new Date(confirmedDate);
      task.dueDateText = new Date(confirmedDate).toLocaleDateString();
      task.status = new Date(confirmedDate) < new Date() ? 'overdue' : 'upcoming';
    }

    const saved = await task.save();
    await saved.populate('memory', 'title category createdAt');

    res.json({
      success: true,
      message: 'Task deadline confirmed',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// Delete task
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// Re-extract tasks from a memory transcript
exports.extractFromMemory = async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.memoryId);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    const extracted = extractTasksFromTranscript(memory.originalTranscript || memory.transcript, {
      memoryId: memory._id,
      category: memory.category,
    });

    const createdTasks = [];
    for (const t of extracted) {
      const existing = await Task.findOne({ title: t.title, memory: memory._id });
      if (!existing) {
        const created = await Task.create(t);
        await created.populate('memory', 'title category createdAt');
        createdTasks.push(created);
      }
    }

    res.json({
      success: true,
      count: createdTasks.length,
      data: createdTasks,
    });
  } catch (error) {
    next(error);
  }
};
