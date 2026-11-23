import apiClient from './apiClient';

export const reminderApi = {
  // Fetch reminders
  getAll: (params = {}) => apiClient.get('/reminders', { params }),

  // Create reminder
  create: (data) => apiClient.post('/reminders', data),

  // Mark reminder as completed
  complete: (id) => apiClient.patch(`/reminders/${id}/complete`),

  // Snooze reminder
  snooze: (id, data = {}) => apiClient.patch(`/reminders/${id}/snooze`, data),

  // Reschedule reminder
  reschedule: (id, data) => apiClient.patch(`/reminders/${id}/reschedule`, data),

  // Delete reminder
  delete: (id) => apiClient.delete(`/reminders/${id}`),

  // Get notification preferences
  getPreferences: () => apiClient.get('/reminders/preferences'),

  // Update notification preferences
  updatePreferences: (data) => apiClient.put('/reminders/preferences', data),
};

export default reminderApi;
