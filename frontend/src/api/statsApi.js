import apiClient from './apiClient';

export const statsApi = {
  // Get memory analytics
  getStats: () => apiClient.get('/stats'),

  // Get tags
  getTags: () => apiClient.get('/tags'),

  // Check health of backend
  checkHealth: () => apiClient.get('/health'),
};

export default statsApi;
