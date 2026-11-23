import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Set default notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const REMINDER_CATEGORY_ID = 'ECHO_REMINDER_ACTIONS';

/**
 * Configure interactive notification action buttons
 * - Complete
 * - Snooze (15 mins)
 */
export async function setupNotificationCategories() {
  try {
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
      {
        identifier: 'COMPLETE_ACTION',
        buttonTitle: '✓ Mark Completed',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'SNOOZE_ACTION',
        buttonTitle: '⏰ Snooze 15m',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (err) {
    console.warn('Failed to configure notification categories:', err);
  }
}

/**
 * Request notification permissions with graceful handling
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return {
        granted: false,
        status: finalStatus,
        message: 'Notification permissions were denied. You can enable them in system settings.',
      };
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('echo_reminders', {
        name: 'Echo Memory & Task Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    return {
      granted: true,
      status: finalStatus,
    };
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return {
      granted: false,
      error: error.message,
    };
  }
}

/**
 * Get Expo push token (if remote push is used)
 */
export async function getExpoPushToken() {
  try {
    const perm = await requestNotificationPermissions();
    if (!perm.granted) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    return tokenData?.data || null;
  } catch (err) {
    return null;
  }
}

/**
 * Schedule a reliable local reminder notification
 * Handles duplicate cancellation before scheduling!
 */
export async function scheduleReminderNotification({
  id,
  title,
  body,
  date,
  data = {},
  existingNotificationId,
}) {
  try {
    // 1. Duplicate Prevention: Cancel previous notification if provided
    if (existingNotificationId) {
      await cancelScheduledNotification(existingNotificationId);
    }

    const triggerDate = new Date(date);
    const now = new Date();

    // Must be in the future
    if (triggerDate <= now) {
      console.warn('Cannot schedule notification in the past:', triggerDate);
      return null;
    }

    // Setup categories
    await setupNotificationCategories();

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'Echo Reminder',
        body: body || 'You have an upcoming task in Echo.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        categoryIdentifier: REMINDER_CATEGORY_ID,
        data: {
          ...data,
          scheduledFor: triggerDate.toISOString(),
          echoId: id,
        },
      },
      trigger: triggerDate,
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule local notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification reliably
 */
export async function cancelScheduledNotification(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('Could not cancel notification:', notificationId, err.message);
  }
}

/**
 * Send an immediate test notification (fires in 2 seconds)
 */
export async function sendTestNotification() {
  try {
    const perm = await requestNotificationPermissions();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Please enable notifications in device settings to test.');
      return false;
    }

    const testDate = new Date(Date.now() + 2000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Echo Assistant 🔔',
        body: 'Local notifications are configured and working reliably!',
        sound: true,
        data: { test: true },
      },
      trigger: testDate,
    });

    return !!id;
  } catch (err) {
    console.error('Test notification failed:', err);
    return false;
  }
}

export default {
  requestNotificationPermissions,
  setupNotificationCategories,
  scheduleReminderNotification,
  cancelScheduledNotification,
  sendTestNotification,
  getExpoPushToken,
};
