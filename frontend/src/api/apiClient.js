import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import secureStorage from '../utils/secureStore';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: attach Authorization header if token exists
apiClient.interceptors.request.use(
  async (config) => {
    // Allows injecting custom base URL if changed in settings at runtime
    if (global.__CUSTOM_API_URL__) {
      config.baseURL = global.__CUSTOM_API_URL__;
    }

    try {
      const token = await secureStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // In-flight token read fallback
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      'Network request failed. Is the backend server running?';
    console.warn(`[API Error] ${error.config?.url}: ${errorMsg}`);
    return Promise.reject(new Error(errorMsg));
  }
);

export default apiClient;
