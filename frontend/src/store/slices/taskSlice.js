import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import taskApi from '../../api/taskApi';

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await taskApi.getAll(params);
      return {
        tasks: response.data || [],
        sections: response.sections || { upcoming: 0, overdue: 0, pending: 0, completed: 0, ambiguous: 0 },
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const response = await taskApi.create(taskData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await taskApi.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleTaskComplete = createAsyncThunk(
  'tasks/toggleTaskComplete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await taskApi.toggleComplete(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const rescheduleTask = createAsyncThunk(
  'tasks/rescheduleTask',
  async ({ id, dueDate, remindAt }, { rejectWithValue }) => {
    try {
      const response = await taskApi.reschedule(id, { dueDate, remindAt });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const confirmAmbiguousDate = createAsyncThunk(
  'tasks/confirmAmbiguousDate',
  async ({ id, confirmedDate, keepWithoutDeadline }, { rejectWithValue }) => {
    try {
      const response = await taskApi.confirmDate(id, { confirmedDate, keepWithoutDeadline });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id, { rejectWithValue }) => {
    try {
      await taskApi.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  tasks: [],
  sections: {
    upcoming: 0,
    overdue: 0,
    pending: 0,
    completed: 0,
    ambiguous: 0,
  },
  activeSection: 'upcoming', // 'upcoming' | 'overdue' | 'pending' | 'completed' | 'all'
  loading: false,
  actionLoading: false,
  error: null,
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setActiveSection: (state, action) => {
      state.activeSection = action.payload;
    },
    clearTaskError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks;
        state.sections = action.payload.sections;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create task
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload);
        if (action.payload.dueDate) {
          state.sections.upcoming += 1;
        } else {
          state.sections.pending += 1;
        }
      })

      // Update task
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) {
          state.tasks[idx] = action.payload;
        }
      })

      // Toggle Complete
      .addCase(toggleTaskComplete.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) {
          const old = state.tasks[idx];
          state.tasks[idx] = action.payload;

          // Adjust counters
          if (action.payload.isCompleted) {
            state.sections.completed += 1;
            if (old.dueDate && new Date(old.dueDate) < new Date()) {
              state.sections.overdue = Math.max(0, state.sections.overdue - 1);
            } else if (old.dueDate) {
              state.sections.upcoming = Math.max(0, state.sections.upcoming - 1);
            } else {
              state.sections.pending = Math.max(0, state.sections.pending - 1);
            }
          } else {
            state.sections.completed = Math.max(0, state.sections.completed - 1);
            if (action.payload.dueDate && new Date(action.payload.dueDate) < new Date()) {
              state.sections.overdue += 1;
            } else if (action.payload.dueDate) {
              state.sections.upcoming += 1;
            } else {
              state.sections.pending += 1;
            }
          }
        }
      })

      // Reschedule Task
      .addCase(rescheduleTask.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) {
          state.tasks[idx] = action.payload;
        }
      })

      // Confirm Ambiguous Date
      .addCase(confirmAmbiguousDate.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) {
          state.tasks[idx] = action.payload;
          state.sections.ambiguous = Math.max(0, state.sections.ambiguous - 1);
        }
      })

      // Delete Task
      .addCase(deleteTask.fulfilled, (state, action) => {
        const deleted = state.tasks.find((t) => t._id === action.payload);
        if (deleted) {
          if (deleted.isCompleted) {
            state.sections.completed = Math.max(0, state.sections.completed - 1);
          } else if (!deleted.dueDate) {
            state.sections.pending = Math.max(0, state.sections.pending - 1);
          } else if (new Date(deleted.dueDate) < new Date()) {
            state.sections.overdue = Math.max(0, state.sections.overdue - 1);
          } else {
            state.sections.upcoming = Math.max(0, state.sections.upcoming - 1);
          }
        }
        state.tasks = state.tasks.filter((t) => t._id !== action.payload);
      });
  },
});

export const { setActiveSection, clearTaskError } = taskSlice.actions;

export default taskSlice.reducer;
