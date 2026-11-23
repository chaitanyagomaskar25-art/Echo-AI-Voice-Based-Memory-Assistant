import apiClient from './apiClient';

export const conversationApi = {
  // Get all conversation threads
  getAll: () => apiClient.get('/conversations'),

  // Get specific conversation with full message history
  getById: (id) => apiClient.get(`/conversations/${id}`),

  // Create new conversation thread
  create: (data = {}) => apiClient.post('/conversations', data),

  // Send a message within a conversation (runs semantic memory RAG)
  sendMessage: (id, data) => apiClient.post(`/conversations/${id}/messages`, data),

  // Delete a specific conversation
  delete: (id) => apiClient.delete(`/conversations/${id}`),

  // Clear all conversations
  clearAll: () => apiClient.delete('/conversations'),
};

export default conversationApi;
