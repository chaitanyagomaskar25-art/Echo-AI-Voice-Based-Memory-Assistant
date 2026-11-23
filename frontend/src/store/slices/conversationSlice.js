import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import conversationApi from '../../api/conversationApi';

// Fetch all conversation summaries
export const fetchConversations = createAsyncThunk(
  'conversations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await conversationApi.getAll();
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Load single conversation thread
export const loadConversationThread = createAsyncThunk(
  'conversations/loadThread',
  async (id, { rejectWithValue }) => {
    try {
      const response = await conversationApi.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create new conversation
export const createNewConversation = createAsyncThunk(
  'conversations/create',
  async (payload = {}, { rejectWithValue }) => {
    try {
      const response = await conversationApi.create(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Send message within active conversation
export const sendMessageInConversation = createAsyncThunk(
  'conversations/sendMessage',
  async ({ conversationId, text, category, dateFilter }, { rejectWithValue }) => {
    try {
      const id = conversationId || 'new';
      const response = await conversationApi.sendMessage(id, { text, category, dateFilter });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete specific conversation
export const deleteConversation = createAsyncThunk(
  'conversations/delete',
  async (id, { rejectWithValue }) => {
    try {
      await conversationApi.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Clear all conversations
export const clearAllConversations = createAsyncThunk(
  'conversations/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      await conversationApi.clearAll();
      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  conversations: [],
  activeConversation: null,
  activeConversationId: null,
  loading: false,
  sending: false,
  error: null,
};

const conversationSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setActiveConversationId: (state, action) => {
      state.activeConversationId = action.payload;
    },
    resetActiveConversation: (state) => {
      state.activeConversation = null;
      state.activeConversationId = null;
    },
    addUserOptimisticMessage: (state, action) => {
      if (!state.activeConversation) {
        state.activeConversation = {
          _id: 'temp-' + Date.now(),
          title: action.payload.text.slice(0, 35),
          messages: [],
        };
      }
      state.activeConversation.messages.push({
        _id: 'user-' + Date.now(),
        sender: 'user',
        text: action.payload.text,
        timestamp: new Date().toISOString(),
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Load thread
      .addCase(loadConversationThread.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadConversationThread.fulfilled, (state, action) => {
        state.loading = false;
        state.activeConversation = action.payload;
        state.activeConversationId = action.payload?._id || null;
      })
      .addCase(loadConversationThread.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create new conversation
      .addCase(createNewConversation.fulfilled, (state, action) => {
        state.activeConversation = action.payload;
        state.activeConversationId = action.payload._id;
        state.conversations.unshift({
          _id: action.payload._id,
          title: action.payload.title,
          messageCount: action.payload.messages?.length || 0,
          lastMessageSnippet: 'Started new conversation',
          lastMessageAt: action.payload.createdAt,
          createdAt: action.payload.createdAt,
          updatedAt: action.payload.updatedAt,
        });
      })

      // Send message
      .addCase(sendMessageInConversation.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessageInConversation.fulfilled, (state, action) => {
        state.sending = false;
        const { conversation } = action.payload;
        state.activeConversation = conversation;
        state.activeConversationId = conversation._id;

        // Update in conversations list or prepend
        const existingIdx = state.conversations.findIndex((c) => c._id === conversation._id);
        const summaryItem = {
          _id: conversation._id,
          title: conversation.title,
          messageCount: conversation.messages.length,
          lastMessageSnippet: conversation.lastMessageSnippet,
          lastMessageAt: conversation.lastMessageAt,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };

        if (existingIdx !== -1) {
          state.conversations.splice(existingIdx, 1);
        }
        state.conversations.unshift(summaryItem);
      })
      .addCase(sendMessageInConversation.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload;
        if (state.activeConversation) {
          state.activeConversation.messages.push({
            _id: 'err-' + Date.now(),
            sender: 'echo',
            text: 'Sorry, Echo could not reach the memory server. Please check your backend connection.',
            timestamp: new Date().toISOString(),
          });
        }
      })

      // Delete conversation
      .addCase(deleteConversation.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.conversations = state.conversations.filter((c) => c._id !== deletedId);
        if (state.activeConversationId === deletedId) {
          state.activeConversation = null;
          state.activeConversationId = null;
        }
      })

      // Clear all conversations
      .addCase(clearAllConversations.fulfilled, (state) => {
        state.conversations = [];
        state.activeConversation = null;
        state.activeConversationId = null;
      });
  },
});

export const {
  setActiveConversationId,
  resetActiveConversation,
  addUserOptimisticMessage,
} = conversationSlice.actions;

export default conversationSlice.reducer;
