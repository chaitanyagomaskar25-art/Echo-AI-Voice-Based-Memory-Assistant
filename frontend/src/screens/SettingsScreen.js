import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setServerUrl, setBackendConnected } from '../store/slices/uiSlice';
import { logoutUser } from '../store/slices/authSlice';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  fetchReminders,
  snoozeReminder,
  completeReminder,
  cancelAndRemoveReminder,
} from '../store/slices/reminderSlice';
import notificationService from '../services/notificationService';
import statsApi from '../api/statsApi';
import { API_BASE_URL } from '../config/env';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { ROUTES } from '../navigation/routes';
import { formatRelativeTime } from '../utils/dateFormatter';

export const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark, setThemeMode } = useTheme();
  const currentUrl = useSelector((state) => state.ui.serverUrl) || API_BASE_URL;
  const user = useSelector((state) => state.auth.user);

  const [apiUrl, setApiUrl] = useState(currentUrl);
  const [checking, setChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Notification settings state
  const { preferences, reminders } = useSelector((state) => state.reminders);
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [testingNotification, setTestingNotification] = useState(false);
  const [remindersModalVisible, setRemindersModalVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchNotificationPreferences());
    dispatch(fetchReminders());
    checkNotificationPermission();
  }, [dispatch]);

  const checkNotificationPermission = async () => {
    try {
      const result = await notificationService.requestNotificationPermissions();
      setPermissionStatus(result.granted ? 'granted' : 'denied');
    } catch (e) {
      setPermissionStatus('denied');
    }
  };

  const handleTogglePref = (key, value) => {
    dispatch(updateNotificationPreferences({ [key]: value }));
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    const sent = await notificationService.sendTestNotification();
    setTestingNotification(false);
    if (sent) {
      Alert.alert('Test Notification Scheduled', 'A test reminder notification will fire in 2 seconds.');
    }
  };

  const handleSnooze = (item) => {
    dispatch(
      snoozeReminder({
        id: item._id,
        minutes: 15,
        existingNotificationId: item.notificationId,
        title: item.title,
      })
    );
    Alert.alert('Snoozed', `"${item.title}" snoozed for 15 minutes.`);
  };

  const handleComplete = (item) => {
    dispatch(completeReminder({ id: item._id, notificationId: item.notificationId }));
  };

  const handleCancelReminder = (item) => {
    Alert.alert(
      'Cancel Reminder',
      `Cancel notification for "${item.title}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Reminder',
          style: 'destructive',
          onPress: () =>
            dispatch(cancelAndRemoveReminder({ id: item._id, notificationId: item.notificationId })),
        },
      ]
    );
  };

  const checkConnection = async (testUrl) => {
    setChecking(true);
    setConnectionStatus(null);
    try {
      const res = await statsApi.checkHealth();
      if (res && res.status === 'online') {
        setConnectionStatus({
          online: true,
          message: 'Connected to Echo Backend & MongoDB',
          app: res.app,
        });
        dispatch(setBackendConnected(true));
      } else {
        setConnectionStatus({
          online: false,
          message: 'Backend reached but returned unexpected response.',
        });
      }
    } catch (err) {
      setConnectionStatus({
        online: false,
        message: err.message || 'Could not connect to backend server.',
      });
      dispatch(setBackendConnected(false));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkConnection(currentUrl);
  }, []);

  const handleSaveUrl = () => {
    if (!apiUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid API URL.');
      return;
    }
    dispatch(setServerUrl(apiUrl.trim()));
    checkConnection(apiUrl.trim());
    Alert.alert('Configuration Saved', `API URL updated to: ${apiUrl.trim()}`);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Echo? Your cached auth token will be securely removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            dispatch(logoutUser());
          },
        },
      ]
    );
  };

  const activeReminders = reminders.filter((r) => !r.isCompleted);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.huge,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Account Profile Card */}
        {user && (
          <Card variant="glass" style={styles.sectionCard}>
            <View style={styles.userHeaderRow}>
              <View style={[styles.avatarWrap, { backgroundColor: colors.primary + '25', borderColor: colors.primary }]}>
                <Ionicons
                  name={
                    user.avatar === 'sparkles'
                      ? 'sparkles'
                      : user.avatar === 'mic'
                      ? 'mic'
                      : user.avatar === 'brain'
                      ? 'bulb-outline'
                      : 'person-outline'
                  }
                  size={24}
                  color={colors.primaryLight}
                />
              </View>
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>
                    {user.name}
                  </Text>
                  <Badge label="Authenticated" variant="success" size="sm" />
                </View>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user.email}
                </Text>
              </View>
            </View>

            {user.bio ? (
              <Text style={[styles.userBio, { color: colors.textSecondary }]}>
                "{user.bio}"
              </Text>
            ) : null}

            <View style={[styles.userMetaRow, { borderTopColor: colors.borderLight }]}>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Tone Preference</Text>
                <Text style={[styles.metaValue, { color: colors.primaryLight }]}>
                  {user.voiceTonePreference || 'Balanced'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation?.navigate?.(ROUTES.PROFILE_SETUP)}
                style={[styles.editProfileBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Ionicons name="settings-outline" size={14} color={colors.textPrimary} style={{ marginRight: 4 }} />
                <Text style={[styles.editProfileText, { color: colors.textPrimary }]}>Edit Tone</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Sign Out of Echo"
              variant="danger"
              size="sm"
              icon="log-out-outline"
              onPress={handleSignOut}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        {/* Mobile Push & Local Notification Preferences */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="notifications-outline" size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notification Preferences</Text>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Configure Expo mobile push and local task reminders, advance notice, and sounds.
          </Text>

          {/* Device Permission Row */}
          <View style={[styles.permissionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={permissionStatus === 'granted' ? 'shield-checkmark' : 'alert-circle'}
                size={16}
                color={permissionStatus === 'granted' ? '#10B981' : '#F59E0B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.prefLabel, { color: colors.textPrimary }]}>Device Permission</Text>
            </View>
            <Badge
              label={permissionStatus === 'granted' ? 'Granted' : 'Permission Needed'}
              variant={permissionStatus === 'granted' ? 'success' : 'warning'}
              size="sm"
            />
          </View>

          {/* Toggle Switches */}
          <View style={styles.prefToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.prefLabel, { color: colors.textPrimary }]}>Push & Local Reminders</Text>
              <Text style={[styles.prefSub, { color: colors.textSecondary }]}>Enable scheduled task and memory alerts</Text>
            </View>
            <Switch
              value={preferences.pushEnabled}
              onValueChange={(val) => handleTogglePref('pushEnabled', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.prefToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.prefLabel, { color: colors.textPrimary }]}>Upcoming Task Notifications</Text>
              <Text style={[styles.prefSub, { color: colors.textSecondary }]}>Alert before deadlines are due</Text>
            </View>
            <Switch
              value={preferences.taskRemindersEnabled}
              onValueChange={(val) => handleTogglePref('taskRemindersEnabled', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.prefToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.prefLabel, { color: colors.textPrimary }]}>Daily Memory Briefing</Text>
              <Text style={[styles.prefSub, { color: colors.textSecondary }]}>Morning summary of upcoming tasks & memories</Text>
            </View>
            <Switch
              value={preferences.dailyBriefingNotification}
              onValueChange={(val) => handleTogglePref('dailyBriefingNotification', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.prefToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.prefLabel, { color: colors.textPrimary }]}>Sound & Vibration</Text>
              <Text style={[styles.prefSub, { color: colors.textSecondary }]}>Play sound and vibrate on reminder alerts</Text>
            </View>
            <Switch
              value={preferences.soundEnabled}
              onValueChange={(val) => handleTogglePref('soundEnabled', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Advance Notice Selector */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.prefLabel, { color: colors.textPrimary, marginBottom: 6 }]}>
              Advance Notice Time:
            </Text>
            <View style={styles.advanceRow}>
              {[15, 30, 60].map((mins) => {
                const isSelected = preferences.upcomingTasksAdvanceNotice === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => handleTogglePref('upcomingTasksAdvanceNotice', mins)}
                    style={[
                      styles.advanceChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { backgroundColor: `${colors.primary}25`, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.advanceText,
                        { color: isSelected ? colors.primaryLight : colors.textSecondary },
                        isSelected && { fontWeight: typography.weights.bold },
                      ]}
                    >
                      {mins} mins before
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action buttons: Test Notification & Active Reminders */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Button
              title="Test Notification"
              variant="outline"
              size="sm"
              icon="notifications"
              loading={testingNotification}
              onPress={handleTestNotification}
              style={{ flex: 1 }}
            />
            <Button
              title={`Reminders (${activeReminders.length})`}
              variant="secondary"
              size="sm"
              icon="time"
              onPress={() => setRemindersModalVisible(true)}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Appearance Theme Selector */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="color-palette-outline" size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance & Theme</Text>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Choose between dark charcoal minimal or clean light aesthetic.
          </Text>

          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setThemeMode('dark')}
              style={[
                styles.themeOptionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isDark && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Ionicons
                name="moon"
                size={20}
                color={isDark ? colors.primaryLight : colors.textSecondary}
                style={{ marginBottom: 6 }}
              />
              <Text style={[styles.themeOptionText, { color: isDark ? colors.primaryLight : colors.textPrimary }]}>
                Deep Charcoal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setThemeMode('light')}
              style={[
                styles.themeOptionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                !isDark && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Ionicons
                name="sunny"
                size={20}
                color={!isDark ? colors.primaryLight : colors.textSecondary}
                style={{ marginBottom: 6 }}
              />
              <Text style={[styles.themeOptionText, { color: !isDark ? colors.primaryLight : colors.textPrimary }]}>
                Modern Light
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Backend Connectivity Status */}
        <Card variant={connectionStatus?.online ? 'glass' : 'default'} style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name={connectionStatus?.online ? 'cloud-done-outline' : 'cloud-offline-outline'}
              size={18}
              color={connectionStatus?.online ? colors.emerald : colors.recordRed}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Backend & MongoDB Status</Text>
          </View>

          <View style={[styles.statusBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: connectionStatus?.online ? colors.emerald : colors.recordRed },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.textPrimary }]}>
              {connectionStatus ? connectionStatus.message : 'Checking connectivity...'}
            </Text>
          </View>

          <Button
            title="Test Backend Connection"
            variant="outline"
            size="sm"
            loading={checking}
            onPress={() => checkConnection(apiUrl)}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        {/* API Endpoint Configuration */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="link-outline" size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>API Base URL</Text>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Configure the Node.js Express server URL. On Android Emulator, use 10.0.2.2:5000.
          </Text>

          <TextInput
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://localhost:5000/api"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.urlInput,
              { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
            ]}
          />

          <View style={styles.presetRow}>
            <TouchableOpacity
              onPress={() => setApiUrl('http://localhost:5000/api')}
              style={[styles.presetChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.presetText, { color: colors.primaryLight }]}>Localhost:5000</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setApiUrl('http://10.0.2.2:5000/api')}
              style={[styles.presetChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.presetText, { color: colors.primaryLight }]}>Android (10.0.2.2)</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Save URL Configuration"
            variant="primary"
            size="sm"
            icon="checkmark-outline"
            onPress={handleSaveUrl}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        {/* System & Architecture Info */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Echo Architecture</Text>
          </View>

          <View style={[styles.techItem, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>Mobile Client</Text>
            <Text style={[styles.techValue, { color: colors.textPrimary }]}>React Native (Expo SDK 51)</Text>
          </View>
          <View style={[styles.techItem, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>Backend Server</Text>
            <Text style={[styles.techValue, { color: colors.textPrimary }]}>Node.js Express + Mongoose</Text>
          </View>
          <View style={[styles.techItem, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>Audio Engine</Text>
            <Text style={[styles.techValue, { color: colors.textPrimary }]}>Expo Audio + Whisper STT</Text>
          </View>
          <View style={[styles.techItem, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>Notifications</Text>
            <Text style={[styles.techValue, { color: colors.textPrimary }]}>Expo Notifications + Snooze</Text>
          </View>
          <View style={[styles.techItem, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>Memory Intelligence</Text>
            <Text style={[styles.techValue, { color: colors.textPrimary }]}>Grounded Vector RAG</Text>
          </View>
        </Card>

        {/* App Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Echo – AI Voice-Based Memory Assistant</Text>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>Version 1.0.0 (Expo SDK 51 Native)</Text>
        </View>
      </ScrollView>

      {/* Reminders Management Sheet Modal */}
      <Modal
        visible={remindersModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRemindersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.remindersSheet, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.remindersSheetHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time" size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                  Scheduled Reminders ({activeReminders.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRemindersModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={reminders}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: spacing.md }}
              ListEmptyComponent={
                <View style={styles.emptyRemindersBox}>
                  <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
                  <Text style={[styles.emptyRemindersTitle, { color: colors.textPrimary }]}>
                    No Active Reminders
                  </Text>
                  <Text style={[styles.emptyRemindersSub, { color: colors.textSecondary }]}>
                    Set reminders from any task or voice note to receive notifications.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.reminderCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    item.isCompleted && { opacity: 0.6 },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text
                        style={[
                          styles.reminderTitle,
                          { color: colors.textPrimary },
                          item.isCompleted && { textDecorationLine: 'line-through' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <Text style={[styles.reminderTimeText, { color: colors.primaryLight }]}>
                      ⏰ {new Date(item.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(item.remindAt).toLocaleDateString()}
                    </Text>
                    {item.isSnoozed && (
                      <Text style={[styles.snoozedPill, { color: '#F59E0B' }]}>
                        Snoozed {item.snoozeCount}x
                      </Text>
                    )}
                  </View>

                  {!item.isCompleted ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleSnooze(item)}
                        style={[styles.actionChip, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}
                      >
                        <Text style={[styles.actionChipText, { color: '#F59E0B' }]}>Snooze 15m</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleComplete(item)}
                        style={[styles.actionChip, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                      >
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleCancelReminder(item)}
                        style={styles.trashBtn}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Badge label="Completed" variant="success" size="sm" />
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  description: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  userEmail: {
    fontSize: typography.sizes.xs,
  },
  userBio: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: typography.sizes.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  editProfileText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.semibold,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOptionCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  themeOptionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  prefToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  prefLabel: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.semibold,
  },
  prefSub: {
    fontSize: 10,
    marginTop: 1,
  },
  advanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  advanceChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  advanceText: {
    fontSize: 10,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    flex: 1,
    lineHeight: 18,
  },
  urlInput: {
    fontSize: typography.sizes.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  presetText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.medium,
  },
  techItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  techLabel: {
    fontSize: typography.sizes.xs,
  },
  techValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  footerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  versionText: {
    fontSize: typography.sizes.xxs,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  remindersSheet: {
    maxHeight: '75%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  remindersSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitleText: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.bold,
  },
  emptyRemindersBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyRemindersTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.sm,
  },
  emptyRemindersSub: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.lg,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  reminderTitle: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
  },
  reminderTimeText: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: typography.weights.semibold,
  },
  snoozedPill: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  actionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionChipText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  trashBtn: {
    padding: 4,
  },
});

export default SettingsScreen;
