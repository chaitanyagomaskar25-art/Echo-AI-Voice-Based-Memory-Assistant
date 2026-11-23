import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'echo_auth_jwt_token';
const USER_KEY = 'echo_auth_user_data';

// In-memory fallback if native SecureStore is not accessible
const memoryStorage = {};

export const secureStorage = {
  async saveToken(token) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      memoryStorage[TOKEN_KEY] = token;
    }
  },

  async getToken() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      return token || memoryStorage[TOKEN_KEY] || null;
    } catch (e) {
      return memoryStorage[TOKEN_KEY] || null;
    }
  },

  async removeToken() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      // Ignore
    }
    delete memoryStorage[TOKEN_KEY];
  },

  async saveUser(user) {
    try {
      const userString = JSON.stringify(user);
      await SecureStore.setItemAsync(USER_KEY, userString);
    } catch (e) {
      memoryStorage[USER_KEY] = JSON.stringify(user);
    }
  },

  async getUser() {
    try {
      const userString = await SecureStore.getItemAsync(USER_KEY);
      const str = userString || memoryStorage[USER_KEY];
      return str ? JSON.parse(str) : null;
    } catch (e) {
      return null;
    }
  },

  async removeUser() {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (e) {
      // Ignore
    }
    delete memoryStorage[USER_KEY];
  },

  async clearAll() {
    await this.removeToken();
    await this.removeUser();
  },
};

export default secureStorage;
