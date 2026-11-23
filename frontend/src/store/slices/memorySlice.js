import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import memoryApi from '../../api/memoryApi';

export const fetchMemories = createAsyncThunk(
  'memory/fetchMemories',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await memoryApi.getAll(params);
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const semanticSearchMemories = createAsyncThunk(
  'memory/semanticSearchMemories',
  async ({ query, category, dateFilter }, { rejectWithValue }) => {
    try {
      const response = await memoryApi.semanticSearch({ query, category, dateFilter });
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createMemory = createAsyncThunk(
  'memory/createMemory',
  async (memoryData, { rejectWithValue }) => {
    try {
      const response = await memoryApi.create(memoryData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteMemory = createAsyncThunk(
  'memory/deleteMemory',
  async (id, { rejectWithValue }) => {
    try {
      await memoryApi.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const togglePin = createAsyncThunk(
  'memory/togglePin',
  async (id, { rejectWithValue }) => {
    try {
      const response = await memoryApi.togglePin(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleReminder = createAsyncThunk(
  'memory/toggleReminder',
  async ({ memoryId, reminderId }, { rejectWithValue }) => {
    try {
      const response = await memoryApi.toggleReminder(memoryId, reminderId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const memorySlice = createSlice({
  name: 'memory',
  initialState: {
    memories: [],
    selectedMemory: null,
    loading: false,
    actionLoading: false,
    error: null,
    searchQuery: '',
    selectedCategory: 'All',
    selectedTag: null,
    sortBy: 'newest',
    searchMode: 'semantic', // 'semantic' | 'keyword'
    dateFilter: 'all', // 'all' | 'week' | 'month'
  },
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setSearchMode: (state, action) => {
      state.searchMode = action.payload;
    },
    setDateFilter: (state, action) => {
      state.dateFilter = action.payload;
    },
    setSelectedTag: (state, action) => {
      state.selectedTag = action.payload;
    },
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },
    setSelectedMemory: (state, action) => {
      state.selectedMemory = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch memories
      .addCase(fetchMemories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemories.fulfilled, (state, action) => {
        state.loading = false;
        state.memories = action.payload;
      })
      .addCase(fetchMemories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Semantic Search
      .addCase(semanticSearchMemories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(semanticSearchMemories.fulfilled, (state, action) => {
        state.loading = false;
        state.memories = action.payload;
      })
      .addCase(semanticSearchMemories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create memory
      .addCase(createMemory.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createMemory.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.memories.unshift(action.payload);
      })
      .addCase(createMemory.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      // Delete memory
      .addCase(deleteMemory.fulfilled, (state, action) => {
        state.memories = state.memories.filter((m) => m._id !== action.payload);
        if (state.selectedMemory?._id === action.payload) {
          state.selectedMemory = null;
        }
      })
      // Toggle Pin
      .addCase(togglePin.fulfilled, (state, action) => {
        const index = state.memories.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.memories[index] = action.payload;
        }
        if (state.selectedMemory?._id === action.payload._id) {
          state.selectedMemory = action.payload;
        }
      })
      // Toggle Reminder
      .addCase(toggleReminder.fulfilled, (state, action) => {
        const index = state.memories.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.memories[index] = action.payload;
        }
        if (state.selectedMemory?._id === action.payload._id) {
          state.selectedMemory = action.payload;
        }
      });
  },
});

export const {
  setSearchQuery,
  setSelectedCategory,
  setSelectedTag,
  setSortBy,
  setSearchMode,
  setDateFilter,
  setSelectedMemory,
  clearError,
} = memorySlice.actions;

export default memorySlice.reducer;
