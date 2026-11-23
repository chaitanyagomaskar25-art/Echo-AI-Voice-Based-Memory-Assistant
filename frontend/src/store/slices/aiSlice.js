import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import aiApi from '../../api/aiApi';

export const askEchoQuestion = createAsyncThunk(
  'ai/askEchoQuestion',
  async (payload, { rejectWithValue }) => {
    try {
      const { question, category, dateFilter } =
        typeof payload === 'string' ? { question: payload } : payload;
      const response = await aiApi.askEcho(question, { category, dateFilter });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState: {
    chatHistory: [
      {
        id: 'welcome',
        type: 'echo',
        text: "Hello! I'm Echo, your voice memory assistant. Ask me anything like 'Where did I leave my passport?' or 'What are my deadlines?'",
        timestamp: new Date().toISOString(),
        citedMemories: [],
      },
    ],
    asking: false,
    error: null,
  },
  reducers: {
    addMessage: (state, action) => {
      state.chatHistory.push(action.payload);
    },
    clearChat: (state) => {
      state.chatHistory = [
        {
          id: 'welcome',
          type: 'echo',
          text: "Echo ready! Ask me anything about what you've stored in memory.",
          timestamp: new Date().toISOString(),
          citedMemories: [],
        },
      ];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(askEchoQuestion.pending, (state) => {
        state.asking = true;
        state.error = null;
      })
      .addCase(askEchoQuestion.fulfilled, (state, action) => {
        state.asking = false;
        state.chatHistory.push({
          id: `echo-${Date.now()}`,
          type: 'echo',
          text: action.payload.answer,
          timestamp: action.payload.timestamp || new Date().toISOString(),
          citedMemories: action.payload.citedMemories || [],
          confidence: action.payload.confidence,
        });
      })
      .addCase(askEchoQuestion.rejected, (state, action) => {
        state.asking = false;
        state.error = action.payload;
        state.chatHistory.push({
          id: `error-${Date.now()}`,
          type: 'echo',
          text: "Sorry, I had trouble connecting to your memory server. Make sure the backend is running.",
          timestamp: new Date().toISOString(),
          isError: true,
        });
      });
  },
});

export const { addMessage, clearChat } = aiSlice.actions;
export default aiSlice.reducer;
