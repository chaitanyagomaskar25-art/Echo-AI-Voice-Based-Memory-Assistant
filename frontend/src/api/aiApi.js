import apiClient from './apiClient';

export const aiApi = {
  // Conversational memory Q&A ("Ask Echo") with filters
  askEcho: (question, options = {}) => apiClient.post('/ai/ask', { question, ...options }),

  // Preview AI metadata enrichment
  enrichText: (text) => apiClient.post('/ai/enrich', { text }),
};

export default aiApi;
