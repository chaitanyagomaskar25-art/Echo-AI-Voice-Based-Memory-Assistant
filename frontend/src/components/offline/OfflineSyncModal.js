import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import {
  setSyncModalVisible,
  triggerManualSync,
  retryFailedUpload,
  discardOfflineRecording,
} from '../../store/slices/offlineSlice';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';
import Card from '../common/Card';
import Button from '../common/Button';

export const OfflineSyncModal = () => {
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();

  const { isOnline, isSyncing, queue, syncModalVisible, lastSyncedAt } = useSelector(
    (state) => state.offline
  );

  // Audio preview state
  const [playingId, setPlayingId] = useState(null);
  const [playbackSound, setPlaybackSound] = useState(null);

  const handleClose = async () => {
    if (playbackSound) {
      await playbackSound.stopAsync();
      await playbackSound.unloadAsync();
      setPlaybackSound(null);
      setPlayingId(null);
    }
    dispatch(setSyncModalVisible(false));
  };

  const handleSyncAll = () => {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        'No internet connection detected. Please connect to Wi-Fi or mobile data to sync.'
      );
      return;
    }
    dispatch(triggerManualSync());
  };

  const handleRetryItem = (localId) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot upload while offline. Connect to internet first.');
      return;
    }
    dispatch(retryFailedUpload(localId));
  };

  const handleDiscardItem = (localId, title) => {
    Alert.alert(
      'Discard Recording?',
      `Are you sure you want to discard "${title || 'this recording'}"? This cannot be undone.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => dispatch(discardOfflineRecording(localId)),
        },
      ]
    );
  };

  const handleTogglePlayLocalAudio = async (item) => {
    try {
      if (playingId === item.localId && playbackSound) {
        await playbackSound.pauseAsync();
        setPlayingId(null);
        return;
      }

      if (playbackSound) {
        await playbackSound.stopAsync();
        await playbackSound.unloadAsync();
        setPlaybackSound(null);
      }

      if (!item.uri) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: item.uri },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            setPlayingId(null);
          }
        }
      );

      setPlaybackSound(sound);
      setPlayingId(item.localId);
    } catch (err) {
      console.warn('Local preview error:', err.message);
      Alert.alert('Audio Error', 'Could not preview local audio recording.');
    }
  };

  const pendingItems = queue || [];

  return (
    <Modal
      visible={syncModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.sheetContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={[
                  styles.onlineIndicatorDot,
                  { backgroundColor: isOnline ? '#10B981' : '#F97316' },
                ]}
              />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Offline Sync Manager
              </Text>
            </View>

            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Safe Storage Guarantee Banner */}
            <View
              style={[
                styles.guaranteeBanner,
                { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}35` },
              ]}
            >
              <Ionicons name="shield-checkmark" size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.guaranteeTitle, { color: colors.primaryLight }]}>
                  Safe Offline Guarantee
                </Text>
                <Text style={[styles.guaranteeText, { color: colors.textSecondary }]}>
                  Unsynced recordings are stored permanently on your device. They are NEVER deleted until MongoDB confirms successful storage.
                </Text>
              </View>
            </View>

            {/* Sync Action Toolbar */}
            <View style={styles.toolbarRow}>
              <View>
                <Text style={[styles.queueCountText, { color: colors.textPrimary }]}>
                  {pendingItems.length} Unsynced Recording{pendingItems.length === 1 ? '' : 's'}
                </Text>
                <Text style={[styles.networkStatusText, { color: isOnline ? '#10B981' : '#F97316' }]}>
                  {isOnline ? '● Connected to Echo Cloud' : '○ Offline Mode'}
                </Text>
              </View>

              {pendingItems.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSyncAll}
                  disabled={isSyncing || !isOnline}
                  style={[
                    styles.syncAllBtn,
                    {
                      backgroundColor: isOnline ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="sync" size={14} color={isOnline ? '#FFFFFF' : colors.textMuted} style={{ marginRight: 5 }} />
                  )}
                  <Text
                    style={[
                      styles.syncAllBtnText,
                      { color: isOnline ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    {isSyncing ? 'Syncing...' : 'Sync All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Queue List */}
            {pendingItems.length === 0 ? (
              <View style={styles.allSyncedCard}>
                <Ionicons name="cloud-done-outline" size={44} color="#10B981" style={{ marginBottom: 10 }} />
                <Text style={[styles.allSyncedTitle, { color: colors.textPrimary }]}>
                  All Caught Up!
                </Text>
                <Text style={[styles.allSyncedSub, { color: colors.textSecondary }]}>
                  Zero pending uploads. All your voice notes and memories are safely synchronized with MongoDB.
                </Text>
              </View>
            ) : (
              <View style={styles.queueList}>
                {pendingItems.map((item) => {
                  const isPlaying = playingId === item.localId;
                  const isFailed = item.status === 'failed';
                  const isUploading = item.status === 'uploading';

                  return (
                    <View
                      key={item.localId}
                      style={[
                        styles.queueCard,
                        { backgroundColor: colors.surface, borderColor: isFailed ? '#EF4444' : colors.border },
                      ]}
                    >
                      <View style={styles.queueCardHeader}>
                        {/* Play/Pause Local Audio Preview */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleTogglePlayLocalAudio(item)}
                          style={[
                            styles.audioPlayBtn,
                            { backgroundColor: isPlaying ? colors.primary : `${colors.primary}20` },
                          ]}
                        >
                          <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={16}
                            color={isPlaying ? '#FFFFFF' : colors.primaryLight}
                          />
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                            {item.duration ? `${item.duration}s audio • ` : ''}
                            {item.category} • Captured {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isFailed
                                ? 'rgba(239, 68, 68, 0.15)'
                                : isUploading
                                ? 'rgba(99, 102, 241, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color: isFailed
                                  ? '#EF4444'
                                  : isUploading
                                  ? colors.primaryLight
                                  : '#F59E0B',
                              },
                            ]}
                          >
                            {isFailed ? 'FAILED' : isUploading ? 'UPLOADING' : 'PENDING'}
                          </Text>
                        </View>
                      </View>

                      {/* Error Banner if failed */}
                      {isFailed && item.lastError ? (
                        <View style={styles.errorNoticeRow}>
                          <Ionicons name="alert-circle" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={styles.errorNoticeText} numberOfLines={2}>
                            {item.lastError} (Retried {item.retryCount || 1}x)
                          </Text>
                        </View>
                      ) : null}

                      {/* Action buttons on item */}
                      <View style={[styles.itemActionsRow, { borderTopColor: colors.borderLight }]}>
                        {isFailed ? (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleRetryItem(item.localId)}
                            style={styles.retryActionBtn}
                          >
                            <Ionicons name="refresh" size={13} color={colors.primaryLight} style={{ marginRight: 4 }} />
                            <Text style={[styles.retryActionText, { color: colors.primaryLight }]}>
                              Retry Upload
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="cloud-upload-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                            <Text style={[styles.autoSyncNote, { color: colors.textSecondary }]}>
                              Auto-syncs when online
                            </Text>
                          </View>
                        )}

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleDiscardItem(item.localId, item.title)}
                          style={styles.discardBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  onlineIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  guaranteeTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  guaranteeText: {
    fontSize: typography.sizes.xxs,
    lineHeight: 16,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  queueCountText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  networkStatusText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  syncAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  syncAllBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  allSyncedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.xl,
  },
  allSyncedTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: 6,
  },
  allSyncedSub: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  queueList: {
    gap: 10,
    marginBottom: 24,
  },
  queueCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
  },
  queueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  itemMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  errorNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
  },
  errorNoticeText: {
    fontSize: 10,
    color: '#EF4444',
  },
  itemActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  retryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryActionText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  autoSyncNote: {
    fontSize: typography.sizes.xxs,
  },
  discardBtn: {
    padding: 2,
  },
});

export default OfflineSyncModal;
