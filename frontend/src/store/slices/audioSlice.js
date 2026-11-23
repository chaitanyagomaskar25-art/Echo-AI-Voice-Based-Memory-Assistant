import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import audioApi from '../../api/audioApi';
import { fetchMemories } from './memorySlice';

export const uploadVoiceRecording = createAsyncThunk(
  'audio/uploadVoiceRecording',
  async (
    { uri, duration, transcript, title, category, language = 'en', saveImmediately = true },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setUploadStatus('uploading'));
      dispatch(setUploadProgress(15));

      const response = await audioApi.uploadAudio({
        uri,
        duration,
        transcript,
        title,
        category,
        language,
        saveImmediately,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.min(
              80,
              Math.round((progressEvent.loaded * 100) / progressEvent.total)
            );
            dispatch(setUploadProgress(percent));
            if (percent >= 80) {
              dispatch(setUploadStatus('processing'));
            }
          }
        },
      });

      dispatch(setUploadProgress(100));
      dispatch(setUploadStatus('success'));

      // Refresh memory list so the new recording shows up everywhere
      dispatch(fetchMemories());

      return response.data;
    } catch (error) {
      dispatch(setUploadStatus('error'));
      return rejectWithValue(error.message || 'Audio upload or speech-to-text failed.');
    }
  }
);

export const retryTranscription = createAsyncThunk(
  'audio/retryTranscription',
  async ({ memoryId, language = 'en' }, { dispatch, rejectWithValue }) => {
    try {
      const response = await audioApi.retryTranscription(memoryId, language);
      dispatch(fetchMemories());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Retry transcription failed.');
    }
  }
);

export const updateTranscript = createAsyncThunk(
  'audio/updateTranscript',
  async ({ memoryId, transcript, title, category }, { dispatch, rejectWithValue }) => {
    try {
      const response = await audioApi.updateTranscript(memoryId, {
        transcript,
        title,
        category,
      });
      dispatch(fetchMemories());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update transcript.');
    }
  }
);

const audioSlice = createSlice({
  name: 'audio',
  initialState: {
    isRecording: false,
    isPaused: false,
    recordingDuration: 0,
    audioUri: null,
    isPlaying: false,
    currentlyPlayingId: null,
    meterLevels: [0.2, 0.4, 0.6, 0.8, 0.5, 0.3, 0.7, 0.9, 0.4, 0.2],
    uploadProgress: 0,
    uploadStatus: 'idle', // 'idle' | 'uploading' | 'processing' | 'success' | 'error'
    uploadError: null,
    lastRecordedMemory: null,
    retryLoading: false,
    updateLoading: false,
  },
  reducers: {
    setIsRecording: (state, action) => {
      state.isRecording = action.payload;
    },
    setIsPaused: (state, action) => {
      state.isPaused = action.payload;
    },
    setRecordingDuration: (state, action) => {
      state.recordingDuration = action.payload;
    },
    setAudioUri: (state, action) => {
      state.audioUri = action.payload;
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setCurrentlyPlayingId: (state, action) => {
      state.currentlyPlayingId = action.payload;
    },
    setMeterLevels: (state, action) => {
      state.meterLevels = action.payload;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    setUploadStatus: (state, action) => {
      state.uploadStatus = action.payload;
    },
    resetUploadState: (state) => {
      state.uploadProgress = 0;
      state.uploadStatus = 'idle';
      state.uploadError = null;
    },
    resetAudioState: (state) => {
      state.isRecording = false;
      state.isPaused = false;
      state.recordingDuration = 0;
      state.audioUri = null;
      state.isPlaying = false;
      state.currentlyPlayingId = null;
      state.uploadProgress = 0;
      state.uploadStatus = 'idle';
      state.uploadError = null;
    },
  },
  extraReducers: (builder) => {
    // Upload Voice Recording
    builder
      .addCase(uploadVoiceRecording.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.uploadError = null;
      })
      .addCase(uploadVoiceRecording.fulfilled, (state, action) => {
        state.uploadStatus = 'success';
        state.uploadProgress = 100;
        state.lastRecordedMemory = action.payload?.memory || null;
      })
      .addCase(uploadVoiceRecording.rejected, (state, action) => {
        state.uploadStatus = 'error';
        state.uploadError = action.payload;
      });

    // Retry Transcription
    builder
      .addCase(retryTranscription.pending, (state) => {
        state.retryLoading = true;
      })
      .addCase(retryTranscription.fulfilled, (state, action) => {
        state.retryLoading = false;
        state.lastRecordedMemory = action.payload;
      })
      .addCase(retryTranscription.rejected, (state) => {
        state.retryLoading = false;
      });

    // Update Transcript
    builder
      .addCase(updateTranscript.pending, (state) => {
        state.updateLoading = true;
      })
      .addCase(updateTranscript.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.lastRecordedMemory = action.payload;
      })
      .addCase(updateTranscript.rejected, (state) => {
        state.updateLoading = false;
      });
  },
});

export const {
  setIsRecording,
  setIsPaused,
  setRecordingDuration,
  setAudioUri,
  setIsPlaying,
  setCurrentlyPlayingId,
  setMeterLevels,
  setUploadProgress,
  setUploadStatus,
  resetUploadState,
  resetAudioState,
} = audioSlice.actions;

export default audioSlice.reducer;
