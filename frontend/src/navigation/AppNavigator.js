import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import BottomTabNavigator from './BottomTabNavigator';
import AuthNavigator from './AuthNavigator';
import MemoryDetailScreen from '../screens/MemoryDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import TranscriptionReviewScreen from '../screens/TranscriptionReviewScreen';
import TasksScreen from '../screens/TasksScreen';
import InsightsScreen from '../screens/InsightsScreen';
import RecapScreen from '../screens/RecapScreen';
import { ROUTES } from './routes';
import { useTheme } from '../theme/ThemeContext';
import typography from '../theme/typography';
import { restoreStoredAuth } from '../store/slices/authSlice';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch();

  const { isAuthenticated, isRestoringToken } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(restoreStoredAuth());
  }, [dispatch]);

  // Splash / Loading while restoring token from SecureStore
  if (isRestoringToken) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.splashIconWrap, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="sparkles" size={36} color={colors.primaryLight} />
        </View>
        <Text style={[styles.splashTitle, { color: colors.textPrimary }]}>Echo</Text>
        <Text style={[styles.splashSubtitle, { color: colors.textSecondary }]}>
          Initializing AI Voice Assistant...
        </Text>
        <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: typography.weights.bold,
            fontSize: typography.sizes.md,
            letterSpacing: typography.letterSpacing.tight,
          },
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {!isAuthenticated ? (
          // Unauthenticated flow
          <Stack.Screen
            name="AuthFlow"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          // Authenticated Protected flow
          <>
            <Stack.Screen
              name={ROUTES.MAIN_TABS}
              component={BottomTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name={ROUTES.PROFILE_SETUP}
              component={ProfileSetupScreen}
              options={{
                title: 'Personalization',
                headerShown: true,
              }}
            />
            <Stack.Screen
              name={ROUTES.MEMORY_DETAIL}
              component={MemoryDetailScreen}
              options={{
                title: 'Memory Detail',
              }}
            />
            <Stack.Screen
              name={ROUTES.TRANSCRIPTION_REVIEW}
              component={TranscriptionReviewScreen}
              options={{
                title: 'Review Transcript',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name={ROUTES.SETTINGS}
              component={SettingsScreen}
              options={{
                title: 'Settings & Status',
              }}
            />
            <Stack.Screen
              name={ROUTES.TASKS}
              component={TasksScreen}
              options={{
                title: 'AI Task Manager',
              }}
            />
            <Stack.Screen
              name={ROUTES.INSIGHTS}
              component={InsightsScreen}
              options={{
                title: 'Cognitive Insights',
              }}
            />
            <Stack.Screen
              name={ROUTES.RECAP}
              component={RecapScreen}
              options={{
                title: 'Memory Recap',
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  splashSubtitle: {
    fontSize: typography.sizes.sm,
    marginTop: 6,
  },
});

export default AppNavigator;
