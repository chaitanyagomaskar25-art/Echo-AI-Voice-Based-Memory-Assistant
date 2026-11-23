import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    backendConnected: true,
    serverUrl: null,
    activeTab: 'Home',
    isDarkMode: true,
    voiceSensitivity: 'medium',
  },
  reducers: {
    setBackendConnected: (state, action) => {
      state.backendConnected = action.payload;
    },
    setServerUrl: (state, action) => {
      state.serverUrl = action.payload;
      global.__CUSTOM_API_URL__ = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setVoiceSensitivity: (state, action) => {
      state.voiceSensitivity = action.payload;
    },
  },
});

export const {
  setBackendConnected,
  setServerUrl,
  setActiveTab,
  setVoiceSensitivity,
} = uiSlice.actions;

export default uiSlice.reducer;
