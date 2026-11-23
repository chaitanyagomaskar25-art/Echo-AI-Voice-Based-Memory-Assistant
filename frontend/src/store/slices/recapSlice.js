import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import recapApi from '../../api/recapApi';

export const fetchRecap = createAsyncThunk(
  'recap/fetchRecap',
  async ({ type = 'daily', date = null, force = false } = {}, { rejectWithValue }) => {
    try {
      const response = await recapApi.getRecap({ type, date, force });
      return response;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch memory recap';
      return rejectWithValue(msg);
    }
  }
);

export const fetchRecapHistory = createAsyncThunk(
  'recap/fetchRecapHistory',
  async ({ type = 'daily', limit = 14 } = {}, { rejectWithValue }) => {
    try {
      const response = await recapApi.getHistory({ type, limit });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch recap history';
      return rejectWithValue(msg);
    }
  }
);

const initialState = {
  currentRecap: null,
  isCached: false,
  cachedAt: null,
  activeType: 'daily', // 'daily' | 'weekly'
  selectedDate: null, // ISO string or null for today
  history: [],
  loading: false,
  refreshing: false,
  historyLoading: false,
  error: null,
};

const recapSlice = createSlice({
  name: 'recap',
  initialState,
  reducers: {
    setActiveType: (state, action) => {
      state.activeType = action.payload;
      state.selectedDate = null;
    },
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    clearRecapError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRecap
      .addCase(fetchRecap.pending, (state, action) => {
        if (action.meta.arg?.force) {
          state.refreshing = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchRecap.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.currentRecap = action.payload.data;
        state.isCached = action.payload.isCached || false;
        state.cachedAt = action.payload.cachedAt || action.payload.generatedAt;
      })
      .addCase(fetchRecap.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload;
      })
      // fetchRecapHistory
      .addCase(fetchRecapHistory.pending, (state) => {
        state.historyLoading = true;
      })
      .addCase(fetchRecapHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchRecapHistory.rejected, (state) => {
        state.historyLoading = false;
      });
  },
});

export const { setActiveType, setSelectedDate, clearRecapError } = recapSlice.actions;
export default recapSlice.reducer;
