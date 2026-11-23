import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import memoryReducer from './slices/memorySlice';
import aiReducer from './slices/aiSlice';
import conversationReducer from './slices/conversationSlice';
import taskReducer from './slices/taskSlice';
import reminderReducer from './slices/reminderSlice';
import recapReducer from './slices/recapSlice';
import offlineReducer from './slices/offlineSlice';
import audioReducer from './slices/audioSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    memory: memoryReducer,
    ai: aiReducer,
    conversations: conversationReducer,
    tasks: taskReducer,
    reminders: reminderReducer,
    recap: recapReducer,
    offline: offlineReducer,
    audio: audioReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
