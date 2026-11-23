import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import offlineStorageService from '../../services/offlineStorageService';
import syncService from '../../services/syncService';
import { fetchMemories } from './memorySlice';

export const initOfflineSync = createAsyncThunk(
  'offline/initOfflineSync',
  async (_, { dispatch }) => {
    // 1. Load initial queue from AsyncStorage
    const queue = await offlineStorageService.getQueue();
    const drafts = await offlineStorageService.getDrafts();

    // 2. Initialize sync listener
    syncService.init((state) => {
      dispatch(setNetworkState(state));
      // Refresh memory library if items were just synced
      if (state.syncedCount && state.syncedCount > 0) {
        dispatch(fetchMemories());
      }
    });

    return { queue, drafts };
  }
);

export const saveOfflineVoiceNote = createAsyncThunk(
  'offline/saveOfflineVoiceNote',
  async (noteData, { dispatch }) => {
    const item = await offlineStorageService.enqueueRecording(noteData);
    const updatedQueue = await offlineStorageService.getQueue();
    // If online, immediately attempt background sync
    if (syncService.isOnline) {
      syncService.syncPendingQueue(dispatch);
    }
    return { item, queue: updatedQueue };
  }
);

export const triggerManualSync = createAsyncThunk(
  'offline/triggerManualSync',
  async (_, { dispatch }) => {
    const result = await syncService.syncPendingQueue(dispatch);
    const updatedQueue = await offlineStorageService.getQueue();
    dispatch(fetchMemories());
    return { ...result, queue: updatedQueue };
  }
);

export const retryFailedUpload = createAsyncThunk(
  'offline/retryFailedUpload',
  async (localId, { dispatch }) => {
    const result = await syncService.retryItem(localId);
    const updatedQueue = await offlineStorageService.getQueue();
    dispatch(fetchMemories());
    return { ...result, queue: updatedQueue };
  }
);

export const discardOfflineRecording = createAsyncThunk(
  'offline/discardOfflineRecording',
  async (localId) => {
    const updatedQueue = await offlineStorageService.confirmAndRemoveItem(localId);
    return { localId, queue: updatedQueue };
  }
);

const initialState = {
  isOnline: true,
  isSyncing: false,
  queue: [],
  drafts: [],
  pendingCount: 0,
  failedCount: 0,
  lastSyncedAt: null,
  syncModalVisible: false,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setNetworkState: (state, action) => {
      if (action.payload.isOnline !== undefined) {
        state.isOnline = action.payload.isOnline;
      }
      if (action.payload.isSyncing !== undefined) {
        state.isSyncing = action.payload.isSyncing;
      }
      if (action.payload.lastSyncedAt) {
        state.lastSyncedAt = action.payload.lastSyncedAt;
      }
    },
    setSyncModalVisible: (state, action) => {
      state.syncModalVisible = action.payload;
    },
    setQueue: (state, action) => {
      state.queue = action.payload;
      state.pendingCount = action.payload.filter((i) => i.status === 'pending').length;
      state.failedCount = action.payload.filter((i) => i.status === 'failed').length;
    },
  },
  extraReducers: (builder) => {
    builder
      // initOfflineSync
      .addCase(initOfflineSync.fulfilled, (state, action) => {
        state.queue = action.payload.queue;
        state.drafts = action.payload.drafts;
        state.pendingCount = action.payload.queue.filter((i) => i.status === 'pending').length;
        state.failedCount = action.payload.queue.filter((i) => i.status === 'failed').length;
      })
      // saveOfflineVoiceNote
      .addCase(saveOfflineVoiceNote.fulfilled, (state, action) => {
        state.queue = action.payload.queue;
        state.pendingCount = action.payload.queue.filter((i) => i.status === 'pending').length;
        state.failedCount = action.payload.queue.filter((i) => i.status === 'failed').length;
      })
      // triggerManualSync
      .addCase(triggerManualSync.pending, (state) => {
        state.isSyncing = true;
      })
      .addCase(triggerManualSync.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.queue = action.payload.queue;
        state.pendingCount = action.payload.queue.filter((i) => i.status === 'pending').length;
        state.failedCount = action.payload.queue.filter((i) => i.status === 'failed').length;
        state.lastSyncedAt = new Date().toISOString();
      })
      .addCase(triggerManualSync.rejected, (state) => {
        state.isSyncing = false;
      })
      // retryFailedUpload
      .addCase(retryFailedUpload.fulfilled, (state, action) => {
        state.queue = action.payload.queue;
        state.pendingCount = action.payload.queue.filter((i) => i.status === 'pending').length;
        state.failedCount = action.payload.queue.filter((i) => i.status === 'failed').length;
      })
      // discardOfflineRecording
      .addCase(discardOfflineRecording.fulfilled, (state, action) => {
        state.queue = action.payload.queue;
        state.pendingCount = action.payload.queue.filter((i) => i.status === 'pending').length;
        state.failedCount = action.payload.queue.filter((i) => i.status === 'failed').length;
      });
  },
});

export const { setNetworkState, setSyncModalVisible, setQueue } = offlineSlice.actions;
export default offlineSlice.reducer;
