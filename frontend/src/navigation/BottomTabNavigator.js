import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import VoiceRecordScreen from '../screens/VoiceRecordScreen';
import MemoryListScreen from '../screens/MemoryListScreen';
import AskEchoScreen from '../screens/AskEchoScreen';
import TasksScreen from '../screens/TasksScreen';
import InsightsScreen from '../screens/InsightsScreen';
import { ROUTES } from './routes';
import { useTheme } from '../theme/ThemeContext';
import typography from '../theme/typography';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator = () => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName={ROUTES.HOME}
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontSize: typography.sizes.base,
          fontWeight: typography.weights.bold,
          letterSpacing: typography.letterSpacing.tight,
        },
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: isDark ? 'rgba(18, 24, 38, 0.92)' : 'rgba(255, 255, 255, 0.94)',
            borderColor: colors.border,
            bottom: Math.max(insets.bottom, 12),
          },
        ],
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === ROUTES.HOME) {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === ROUTES.RECORD) {
            iconName = 'mic';
          } else if (route.name === ROUTES.MEMORIES) {
            iconName = focused ? 'layers' : 'layers-outline';
          } else if (route.name === ROUTES.TASKS) {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === ROUTES.ASK_ECHO) {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === ROUTES.INSIGHTS) {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          }

          if (route.name === ROUTES.RECORD) {
            return (
              <View style={styles.recordTabIconWrapper}>
                <LinearGradient
                  colors={focused ? colors.gradientRecord : colors.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.recordTabIcon,
                    {
                      shadowColor: focused ? colors.recordRed : colors.primary,
                    },
                  ]}
                >
                  <Ionicons name="mic" size={22} color="#FFFFFF" />
                </LinearGradient>
              </View>
            );
          }

          return (
            <View style={[styles.standardIconWrapper, focused && { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name={iconName} size={20} color={focused ? colors.primaryLight : color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name={ROUTES.HOME}
        component={HomeScreen}
        options={{
          title: 'Echo',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name={ROUTES.MEMORIES}
        component={MemoryListScreen}
        options={{
          title: 'Memories',
          headerTitle: 'Memory Library',
        }}
      />
      <Tab.Screen
        name={ROUTES.RECORD}
        component={VoiceRecordScreen}
        options={{
          title: 'Capture',
          headerTitle: 'Voice Memory',
        }}
      />
      <Tab.Screen
        name={ROUTES.TASKS}
        component={TasksScreen}
        options={{
          title: 'Tasks',
          headerTitle: 'AI Task Manager',
        }}
      />
      <Tab.Screen
        name={ROUTES.ASK_ECHO}
        component={AskEchoScreen}
        options={{
          title: 'Ask Echo',
          headerTitle: 'Conversational Memory',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    paddingBottom: 6,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    marginTop: -2,
  },
  standardIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 2,
  },
  recordTabIconWrapper: {
    top: -12,
  },
  recordTabIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default BottomTabNavigator;
