import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import reminderApi from '../../api/reminderApi';
import notificationService from '../../services/notificationService';

// Fetch all reminders
export const fetchReminders = createAsyncThunk(
  'reminders/fetchReminders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await reminderApi.getAll(params);
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Schedule a new reminder: schedules with Expo Notifications AND persists in MongoDB
export const scheduleNewReminder = createAsyncThunk(
  'reminders/scheduleNew',
  async (reminderData, { rejectWithValue }) => {
    try {
      const { title, note, remindAt, taskId, memoryId, sourceType = 'custom' } = reminderData;

      // 1. Schedule local device notification
      const notificationId = await notificationService.scheduleReminderNotification({
        title: `Reminder: ${title}`,
        body: note || 'You have a scheduled reminder in Echo.',
        date: remindAt,
        data: { taskId, memoryId },
      });

      // 2. Persist in MongoDB
      const response = await reminderApi.create({
        title,
        note,
        remindAt,
        taskId,
        memoryId,
        sourceType,
        notificationId: notificationId || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Snooze reminder (e.g. 15 minutes)
export const snoozeReminder = createAsyncThunk(
  'reminders/snooze',
  async ({ id, minutes = 15, existingNotificationId, title }, { rejectWithValue }) => {
    try {
      // 1. Cancel existing notification & reschedule 15m out
      const newTriggerDate = new Date(Date.now() + minutes * 60 * 1000);
      const newNotificationId = await notificationService.scheduleReminderNotification({
        title: `Snoozed Reminder: ${title || 'Echo Task'}`,
        body: `Snoozed for ${minutes} minutes.`,
        date: newTriggerDate,
        existingNotificationId,
      });

      // 2. Persist in backend
      const response = await reminderApi.snooze(id, {
        minutes,
        notificationId: newNotificationId || '',
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Mark reminder as completed
export const completeReminder = createAsyncThunk(
  'reminders/complete',
  async ({ id, notificationId }, { rejectWithValue }) => {
    try {
      // Cancel pending local notification
      if (notificationId) {
        await notificationService.cancelScheduledNotification(notificationId);
      }
      const response = await reminderApi.complete(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete / Cancel reminder
export const cancelAndRemoveReminder = createAsyncThunk(
  'reminders/delete',
  async ({ id, notificationId }, { rejectWithValue }) => {
    try {
      if (notificationId) {
        await notificationService.cancelScheduledNotification(notificationId);
      }
      await reminderApi.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch notification preferences
export const fetchNotificationPreferences = createAsyncThunk(
  'reminders/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await reminderApi.getPreferences();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update notification preferences
export const updateNotificationPreferences = createAsyncThunk(
  'reminders/updatePreferences',
  async (prefs, { rejectWithValue }) => {
    try {
      const response = await reminderApi.updatePreferences(prefs);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const reminderSlice = createSlice({
  name: 'reminders',
  initialState: {
    reminders: [],
    preferences: {
      pushEnabled: true,
      taskRemindersEnabled: true,
      upcomingTasksAdvanceNotice: 30,
      dailyBriefingNotification: true,
      dailyBriefingTime: '09:00',
      soundEnabled: true,
      vibrationEnabled: true,
    },
    loading: false,
    actionLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch reminders
      .addCase(fetchReminders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.loading = false;
        state.reminders = action.payload;
      })
      .addCase(fetchReminders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Schedule new
      .addCase(scheduleNewReminder.fulfilled, (state, action) => {
        const existingIdx = state.reminders.findIndex((r) => r._id === action.payload._id);
        if (existingIdx !== -1) {
          state.reminders[existingIdx] = action.payload;
        } else {
          state.reminders.unshift(action.payload);
        }
      })

      // Snooze
      .addCase(snoozeReminder.fulfilled, (state, action) => {
        const idx = state.reminders.findIndex((r) => r._id === action.payload._id);
        if (idx !== -1) {
          state.reminders[idx] = action.payload;
        }
      })

      // Complete
      .addCase(completeReminder.fulfilled, (state, action) => {
        const idx = state.reminders.findIndex((r) => r._id === action.payload._id);
        if (idx !== -1) {
          state.reminders[idx] = action.payload;
        }
      })

      // Delete
      .addCase(cancelAndRemoveReminder.fulfilled, (state, action) => {
        state.reminders = state.reminders.filter((r) => r._id !== action.payload);
      })

      // Preferences
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      });
  },
});

export default reminderSlice.reducer;
