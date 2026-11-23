import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import memoryApi from '../../api/memoryApi';

export const fetchMemories = createAsyncThunk(
  'memory/fetchMemories',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await memoryApi.getAll(params);
      const resData = response.data;
      if (Array.isArray(resData)) {
        return {
          data: resData,
          total: resData.length,
          page: 1,
          totalPages: 1,
          hasMore: false,
        };
      }
      return {
        data: resData?.data || [],
        total: resData?.total || 0,
        page: resData?.page || 1,
        totalPages: resData?.totalPages || 1,
        hasMore: resData?.hasMore || false,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMoreMemories = createAsyncThunk(
  'memory/fetchMoreMemories',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { memory } = getState();
      if (memory.loadingMore || !memory.hasMore) return null;
      const nextPage = memory.page + 1;
      const response = await memoryApi.getAll({ ...params, page: nextPage });
      const resData = response.data;
      return {
        data: resData?.data || [],
        page: nextPage,
        totalPages: resData?.totalPages || 1,
        hasMore: resData?.hasMore || false,
      };
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
      const items = response.data?.data || response.data || [];
      return items;
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
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateMemory = createAsyncThunk(
  'memory/updateMemory',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await memoryApi.update(id, data);
      return response.data?.data || response.data;
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
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleFavorite = createAsyncThunk(
  'memory/toggleFavorite',
  async (id, { rejectWithValue }) => {
    try {
      const response = await memoryApi.toggleFavorite(id);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleArchive = createAsyncThunk(
  'memory/toggleArchive',
  async (id, { rejectWithValue }) => {
    try {
      const response = await memoryApi.toggleArchive(id);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchRelatedTasks = createAsyncThunk(
  'memory/fetchRelatedTasks',
  async (memoryId, { rejectWithValue }) => {
    try {
      const response = await memoryApi.getRelatedTasks(memoryId);
      return response.data?.data || response.data || [];
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
      return response.data?.data || response.data;
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
    relatedTasks: [],
    loading: false,
    loadingMore: false,
    actionLoading: false,
    error: null,
    searchQuery: '',
    selectedCategory: 'All',
    selectedTag: null,
    sortBy: 'newest',
    searchMode: 'semantic', // 'semantic' | 'keyword'
    dateFilter: 'all', // 'all' | 'today' | 'week' | 'month' | 'year'
    activeTab: 'all', // 'all' | 'favorites' | 'archived'
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
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
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
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
        state.memories = action.payload.data;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.total = action.payload.total;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchMemories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch more memories (Pagination)
      .addCase(fetchMoreMemories.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(fetchMoreMemories.fulfilled, (state, action) => {
        state.loadingMore = false;
        if (action.payload) {
          // Append unique items
          const existingIds = new Set(state.memories.map((m) => m._id));
          const newItems = action.payload.data.filter((m) => !existingIds.has(m._id));
          state.memories.push(...newItems);
          state.page = action.payload.page;
          state.totalPages = action.payload.totalPages;
          state.hasMore = action.payload.hasMore;
        }
      })
      .addCase(fetchMoreMemories.rejected, (state) => {
        state.loadingMore = false;
      })
      // Semantic Search
      .addCase(semanticSearchMemories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(semanticSearchMemories.fulfilled, (state, action) => {
        state.loading = false;
        state.memories = action.payload;
        state.hasMore = false;
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
        state.total += 1;
      })
      .addCase(createMemory.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      // Update memory
      .addCase(updateMemory.fulfilled, (state, action) => {
        const index = state.memories.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.memories[index] = action.payload;
        }
        if (state.selectedMemory?._id === action.payload._id) {
          state.selectedMemory = action.payload;
        }
      })
      // Delete memory
      .addCase(deleteMemory.fulfilled, (state, action) => {
        state.memories = state.memories.filter((m) => m._id !== action.payload);
        if (state.selectedMemory?._id === action.payload) {
          state.selectedMemory = null;
        }
        state.total = Math.max(0, state.total - 1);
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
      // Toggle Favorite
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const index = state.memories.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.memories[index] = action.payload;
        }
        if (state.selectedMemory?._id === action.payload._id) {
          state.selectedMemory = action.payload;
        }
      })
      // Toggle Archive
      .addCase(toggleArchive.fulfilled, (state, action) => {
        const index = state.memories.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.memories[index] = action.payload;
        }
        if (state.selectedMemory?._id === action.payload._id) {
          state.selectedMemory = action.payload;
        }
      })
      // Fetch Related Tasks
      .addCase(fetchRelatedTasks.fulfilled, (state, action) => {
        state.relatedTasks = action.payload;
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
  setActiveTab,
  setSelectedMemory,
  clearError,
} = memorySlice.actions;

export default memorySlice.reducer;
