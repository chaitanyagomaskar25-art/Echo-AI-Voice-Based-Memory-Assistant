import apiClient from './apiClient';

export const taskApi = {
  // Fetch tasks with optional section & priority filters
  getAll: (params = {}) => apiClient.get('/tasks', { params }),

  // Get single task by ID
  getById: (id) => apiClient.get(`/tasks/${id}`),

  // Create manual task
  create: (data) => apiClient.post('/tasks', data),

  // Update task details
  update: (id, data) => apiClient.put(`/tasks/${id}`, data),

  // Toggle completion
  toggleComplete: (id) => apiClient.patch(`/tasks/${id}/complete`),

  // Reschedule due date
  reschedule: (id, data) => apiClient.patch(`/tasks/${id}/reschedule`, data),

  // Confirm ambiguous date
  confirmDate: (id, data) => apiClient.patch(`/tasks/${id}/confirm-date`, data),

  // Delete task
  delete: (id) => apiClient.delete(`/tasks/${id}`),

  // Extract tasks from memory transcript
  extractFromMemory: (memoryId) => apiClient.post(`/tasks/extract-from-memory/${memoryId}`),
};

export default taskApi;
