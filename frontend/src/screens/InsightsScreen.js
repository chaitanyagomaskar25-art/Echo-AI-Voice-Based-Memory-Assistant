import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import statsApi from '../api/statsApi';
import { toggleReminder } from '../store/slices/memorySlice';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

export const InsightsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await statsApi.getStats();
      if (res.data) setStats(res.data);
    } catch (err) {
      console.warn('Failed to load stats:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleToggleReminder = async (memoryId, reminderId) => {
    await dispatch(toggleReminder({ memoryId, reminderId }));
    setStats((prev) => ({
      ...prev,
      pendingReminders: prev.pendingReminders.filter((r) => r.reminderId !== reminderId),
    }));
  };

  if (loading && !stats) {
    return <LoadingSpinner message="Calculating cognitive insights..." fullScreen />;
  }

  const total = stats?.totalMemories || 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 95,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadStats}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Cognitive Breakdown</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            How your thoughts and memories are distributed
          </Text>
        </View>

        {/* Top Summary Metrics */}
        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Ionicons name="mic-outline" size={20} color={colors.primaryLight} style={styles.metricIcon} />
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{stats?.totalMemories || 0}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Memos</Text>
          </Card>

          <Card style={styles.metricCard}>
            <Ionicons name="pin-outline" size={20} color={colors.amber} style={styles.metricIcon} />
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{stats?.pinnedCount || 0}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Pinned</Text>
          </Card>

          <Card style={styles.metricCard}>
            <Ionicons name="time-outline" size={20} color={colors.emerald} style={styles.metricIcon} />
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{stats?.recentActivityCount || 0}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Past 7 Days</Text>
          </Card>
        </View>

        {/* Category Breakdown Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="pie-chart-outline" size={16} color={colors.cyan} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Category Distribution</Text>
          </View>

          {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
            stats.categoryBreakdown.map((item, idx) => {
              const catColor = colors.categories[item.category] || colors.primary;
              const percentage = Math.round((item.count / total) * 100);

              return (
                <View key={idx} style={styles.barItem}>
                  <View style={styles.barInfoRow}>
                    <View style={styles.barLabelRow}>
                      <View style={[styles.colorSquare, { backgroundColor: catColor }]} />
                      <Text style={[styles.barLabel, { color: colors.textPrimary }]}>{item.category}</Text>
                    </View>
                    <Text style={[styles.barCount, { color: colors.textSecondary }]}>
                      {item.count} ({percentage}%)
                    </Text>
                  </View>
                  <View style={[styles.barBackground, { backgroundColor: colors.surface }]}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${percentage}%`, backgroundColor: catColor },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No category statistics yet.</Text>
          )}
        </Card>

        {/* Pending Actionable Reminders */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="notifications-outline" size={16} color={colors.amber} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Actionable Reminders ({stats?.pendingReminders?.length || 0})
            </Text>
          </View>

          {stats?.pendingReminders && stats.pendingReminders.length > 0 ? (
            stats.pendingReminders.map((rem, idx) => (
              <View key={idx} style={[styles.reminderItem, { borderBottomColor: colors.borderLight }]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleToggleReminder(rem.memoryId, rem.reminderId)}
                  style={styles.reminderCheckBtn}
                >
                  <Ionicons name="square-outline" size={20} color={colors.amber} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('MemoryDetail', { memoryId: rem.memoryId })}
                  style={styles.reminderContent}
                >
                  <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>{rem.title}</Text>
                  <Text style={[styles.reminderSource, { color: colors.textMuted }]}>From "{rem.memoryTitle}"</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>All caught up! No pending reminders.</Text>
          )}
        </Card>

        {/* Emotional Tone / Sentiment Overview */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="happy-outline" size={16} color={colors.emerald} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Emotional Tone Analysis</Text>
          </View>

          <View style={styles.sentimentGrid}>
            {(stats?.sentimentBreakdown || []).map((sent, idx) => (
              <View
                key={idx}
                style={[styles.sentimentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.sentimentCount, { color: colors.textPrimary }]}>{sent.count}</Text>
                <Text style={[styles.sentimentLabel, { color: colors.textSecondary }]}>{sent.sentiment}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
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
  header: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  metricIcon: {
    marginBottom: 4,
  },
  metricValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
  },
  metricLabel: {
    fontSize: typography.sizes.xxs,
    marginTop: 2,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  barItem: {
    marginBottom: spacing.sm,
  },
  barInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 6,
  },
  barLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  barCount: {
    fontSize: typography.sizes.xxs,
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  reminderCheckBtn: {
    marginRight: spacing.sm,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  reminderSource: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  sentimentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sentimentCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  sentimentCount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
  },
  sentimentLabel: {
    fontSize: typography.sizes.xxs,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});

export default InsightsScreen;
