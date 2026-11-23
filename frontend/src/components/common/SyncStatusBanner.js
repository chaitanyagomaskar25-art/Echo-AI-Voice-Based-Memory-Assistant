import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setSyncModalVisible, triggerManualSync } from '../../store/slices/offlineSlice';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';

export const SyncStatusBanner = () => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { isOnline, isSyncing, queue, pendingCount, failedCount } = useSelector(
    (state) => state.offline
  );

  const totalUnsynced = (queue || []).filter((i) => i.status !== 'synced').length;

  // Don't render anything if online and no pending/failed items
  if (isOnline && totalUnsynced === 0 && !isSyncing) {
    return null;
  }

  const handlePress = () => {
    dispatch(setSyncModalVisible(true));
  };

  // Determine status styling and text
  let bannerBg = 'rgba(245, 158, 11, 0.16)';
  let bannerBorder = 'rgba(245, 158, 11, 0.35)';
  let bannerColor = '#F59E0B';
  let iconName = 'cloud-offline-outline';
  let message = 'Offline Mode • Notes saved to device';

  if (!isOnline) {
    bannerBg = 'rgba(234, 88, 12, 0.16)';
    bannerBorder = 'rgba(234, 88, 12, 0.4)';
    bannerColor = '#F97316';
    iconName = 'cloud-offline';
    message = totalUnsynced > 0
      ? `Offline • ${totalUnsynced} recording${totalUnsynced > 1 ? 's' : ''} queued`
      : 'Offline Mode • Voice notes saved locally';
  } else if (isSyncing) {
    bannerBg = 'rgba(99, 102, 241, 0.16)';
    bannerBorder = 'rgba(99, 102, 241, 0.35)';
    bannerColor = '#818CF8';
    iconName = 'sync-outline';
    message = `Syncing ${totalUnsynced} item${totalUnsynced > 1 ? 's' : ''} to MongoDB...`;
  } else if (failedCount > 0) {
    bannerBg = 'rgba(239, 68, 68, 0.16)';
    bannerBorder = 'rgba(239, 68, 68, 0.4)';
    bannerColor = '#EF4444';
    iconName = 'alert-circle';
    message = `${failedCount} upload failed • Tap to retry`;
  } else if (totalUnsynced > 0) {
    bannerBg = 'rgba(16, 185, 129, 0.16)';
    bannerBorder = 'rgba(16, 185, 129, 0.35)';
    bannerColor = '#10B981';
    iconName = 'cloud-upload-outline';
    message = `${totalUnsynced} pending sync • Tap to upload`;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.bannerContainer,
        {
          backgroundColor: bannerBg,
          borderColor: bannerBorder,
        },
      ]}
    >
      <View style={styles.contentRow}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={bannerColor} style={{ marginRight: 6 }} />
        ) : (
          <Ionicons name={iconName} size={15} color={bannerColor} style={{ marginRight: 6 }} />
        )}
        <Text style={[styles.bannerText, { color: bannerColor }]} numberOfLines={1}>
          {message}
        </Text>
      </View>

      <View style={styles.actionPill}>
        <Text style={[styles.actionPillText, { color: bannerColor }]}>Manage</Text>
        <Ionicons name="chevron-forward" size={12} color={bannerColor} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bannerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPillText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 2,
  },
});

export default SyncStatusBanner;
