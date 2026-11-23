import apiClient from './apiClient';

export const memoryApi = {
  // Fetch memories with search & filters
  getAll: (params = {}) => apiClient.get('/memories', { params }),

  // Semantic search with vector embeddings & relevance ranking
  semanticSearch: (data) => apiClient.post('/memories/semantic-search', data),

  // Get single memory
  getById: (id) => apiClient.get(`/memories/${id}`),

  // Create new memory
  create: (data) => apiClient.post('/memories', data),

  // Update memory
  update: (id, data) => apiClient.put(`/memories/${id}`, data),

  // Delete memory
  delete: (id) => apiClient.delete(`/memories/${id}`),

  // Toggle pin
  togglePin: (id) => apiClient.patch(`/memories/${id}/pin`),

  // Toggle favorite
  toggleFavorite: (id) => apiClient.patch(`/memories/${id}/favorite`),

  // Toggle archive
  toggleArchive: (id) => apiClient.patch(`/memories/${id}/archive`),

  // Get related tasks for a memory
  getRelatedTasks: (id) => apiClient.get(`/memories/${id}/tasks`),

  // Toggle reminder
  toggleReminder: (id, reminderId) =>
    apiClient.patch(`/memories/${id}/reminders/${reminderId}/toggle`),
};

export default memoryApi;
