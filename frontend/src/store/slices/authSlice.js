import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authApi from '../../api/authApi';
import secureStorage from '../../utils/secureStore';

// Restore saved authentication from SecureStore on startup
export const restoreStoredAuth = createAsyncThunk(
  'auth/restoreStoredAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStorage.getToken();
      const user = await secureStorage.getUser();

      if (!token) {
        return { token: null, user: null, isAuthenticated: false };
      }

      // Try verifying with backend /me endpoint
      try {
        const response = await authApi.getMe();
        if (response.success && response.user) {
          await secureStorage.saveUser(response.user);
          return { token, user: response.user, isAuthenticated: true };
        }
      } catch (err) {
        // If offline or network issue, fallback to stored user
        if (user) {
          return { token, user, isAuthenticated: true };
        }
      }

      return { token: null, user: null, isAuthenticated: false };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Register user
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const response = await authApi.register({ name, email, password });
      if (response.success && response.token) {
        await secureStorage.saveToken(response.token);
        await secureStorage.saveUser(response.user);
        return { token: response.token, user: response.user };
      }
      return rejectWithValue(response.message || 'Registration failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authApi.login({ email, password });
      if (response.success && response.token) {
        await secureStorage.saveToken(response.token);
        await secureStorage.saveUser(response.user);
        return { token: response.token, user: response.user };
      }
      return rejectWithValue(response.message || 'Invalid credentials');
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authApi.updateProfile(profileData);
      if (response.success && response.user) {
        await secureStorage.saveUser(response.user);
        return response.user;
      }
      return rejectWithValue(response.message || 'Profile update failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Profile update failed');
    }
  }
);

// Request forgot password code
export const requestForgotPassword = createAsyncThunk(
  'auth/requestForgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authApi.forgotPassword(email);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to send reset code');
    }
  }
);

// Reset password with verification code
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, resetCode, newPassword }, { rejectWithValue }) => {
    try {
      const response = await authApi.resetPassword({ email, resetCode, newPassword });
      if (response.success && response.token) {
        await secureStorage.saveToken(response.token);
        await secureStorage.saveUser(response.user);
        return { token: response.token, user: response.user };
      }
      return rejectWithValue(response.message || 'Password reset failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Password reset failed');
    }
  }
);

// Logout user
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async () => {
    await secureStorage.clearAll();
    return true;
  }
);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isRestoringToken: true,
  isLoading: false,
  error: null,
  resetCodeSentInfo: null, // Holds reset code info for test preview
  passwordResetSuccess: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    clearResetState: (state) => {
      state.resetCodeSentInfo = null;
      state.passwordResetSuccess = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Restore stored auth
    builder
      .addCase(restoreStoredAuth.pending, (state) => {
        state.isRestoringToken = true;
      })
      .addCase(restoreStoredAuth.fulfilled, (state, action) => {
        state.isRestoringToken = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = action.payload.isAuthenticated;
      })
      .addCase(restoreStoredAuth.rejected, (state) => {
        state.isRestoringToken = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Update Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Forgot Password
    builder
      .addCase(requestForgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.resetCodeSentInfo = null;
      })
      .addCase(requestForgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.resetCodeSentInfo = action.payload;
        state.error = null;
      })
      .addCase(requestForgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.passwordResetSuccess = false;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.passwordResetSuccess = true;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    });
  },
});

export const { clearAuthError, clearResetState } = authSlice.actions;
export default authSlice.reducer;
