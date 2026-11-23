import apiClient from './apiClient';

export const authApi = {
  /**
   * Register a new user
   */
  async register(data) {
    return apiClient.post('/auth/register', data);
  },

  /**
   * Log in with email and password
   */
  async login(data) {
    return apiClient.post('/auth/login', data);
  },

  /**
   * Fetch current authenticated user profile
   */
  async getMe() {
    return apiClient.get('/auth/me');
  },

  /**
   * Update user profile information & preferences
   */
  async updateProfile(data) {
    return apiClient.put('/auth/profile', data);
  },

  /**
   * Request password reset code
   */
  async forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Reset password with verification code
   */
  async resetPassword(data) {
    return apiClient.post('/auth/reset-password', data);
  },
};

export default authApi;
