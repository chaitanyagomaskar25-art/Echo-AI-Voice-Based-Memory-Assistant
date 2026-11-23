import apiClient from './apiClient';

export const recapApi = {
  /**
   * Get daily or weekly recap
   * @param {Object} params - { type: 'daily' | 'weekly', date: string, force: boolean }
   */
  getRecap: async (params = {}) => {
    const res = await apiClient.get('/recaps', { params });
    return res.data;
  },

  /**
   * Get date-based history of past periods
   * @param {Object} params - { type: 'daily' | 'weekly', limit: number }
   */
  getHistory: async (params = {}) => {
    const res = await apiClient.get('/recaps/history', { params });
    return res.data;
  },

  /**
   * Get recap by MongoDB ID
   * @param {string} id
   */
  getById: async (id) => {
    const res = await apiClient.get(`/recaps/${id}`);
    return res.data;
  },
};

export default recapApi;
