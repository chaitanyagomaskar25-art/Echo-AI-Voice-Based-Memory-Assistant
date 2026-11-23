import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  fetchRecap,
  fetchRecapHistory,
  setActiveType,
  setSelectedDate,
} from '../store/slices/recapSlice';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { ROUTES } from '../navigation/routes';

export const RecapScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();

  const {
    currentRecap,
    isCached,
    cachedAt,
    activeType,
    selectedDate,
    history,
    loading,
    refreshing,
    historyLoading,
  } = useSelector((state) => state.recap);

  // Load history & recap on mount or when type / selectedDate changes
  const loadData = useCallback(
    (force = false) => {
      dispatch(fetchRecap({ type: activeType, date: selectedDate, force }));
      dispatch(fetchRecapHistory({ type: activeType }));
    },
    [dispatch, activeType, selectedDate]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectDate = (dateObj) => {
    const targetIso = dateObj.targetDate ? new Date(dateObj.targetDate).toISOString() : null;
    dispatch(setSelectedDate(targetIso));
  };

  const handleToggleType = (newType) => {
    if (newType !== activeType) {
      dispatch(setActiveType(newType));
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const navigateToMemory = (memoryId) => {
    if (memoryId) {
      navigation.navigate(ROUTES.MEMORY_DETAIL, { memoryId });
    }
  };

  const navigateToTasks = () => {
    navigation.navigate(ROUTES.TASKS);
  };

  const navigateToRecord = () => {
    navigation.navigate(ROUTES.RECORD);
  };

  const sections = currentRecap?.sections || {};
  const stats = currentRecap?.stats || {};
  const hasAnyContent =
    (stats.totalMemories || 0) > 0 ||
    (sections.thingsLearned?.length || 0) > 0 ||
    (sections.ideasCaptured?.length || 0) > 0 ||
    (sections.workCompleted?.length || 0) > 0 ||
    (sections.tasksPending?.length || 0) > 0 ||
    (sections.upcomingDeadlines?.length || 0) > 0 ||
    (sections.importantDecisions?.length || 0) > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header & Segmented Type Switcher */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Math.max(insets.top, 12),
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.headerSubtext, { color: colors.primaryLight }]}>
              AI COGNITIVE DIGEST
            </Text>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Memory Recap
            </Text>
          </View>

          {/* Force Refresh Button & Cache Indicator */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleRefresh}
            style={[
              styles.refreshBtn,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name={refreshing ? 'sync' : 'sparkles-outline'}
              size={15}
              color={colors.primaryLight}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.refreshBtnText, { color: colors.primaryLight }]}>
              {refreshing ? 'Refreshing...' : isCached ? 'AI Cached' : 'Re-synthesize'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Daily / Weekly Segmented Switcher */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleToggleType('daily')}
            style={[
              styles.segmentBtn,
              activeType === 'daily' && { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons
              name="today-outline"
              size={14}
              color={activeType === 'daily' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeType === 'daily' ? '#FFFFFF' : colors.textSecondary },
                activeType === 'daily' && styles.segmentBtnTextActive,
              ]}
            >
              Daily Recap
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleToggleType('weekly')}
            style={[
              styles.segmentBtn,
              activeType === 'weekly' && { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={activeType === 'weekly' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeType === 'weekly' ? '#FFFFFF' : colors.textSecondary },
                activeType === 'weekly' && styles.segmentBtnTextActive,
              ]}
            >
              Weekly Recap
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date-Based History Carousel */}
        <View style={styles.historyCarouselWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyCarouselContent}
          >
            {history.map((item, idx) => {
              const itemDateStr = item.targetDate ? new Date(item.targetDate).toISOString().split('T')[0] : '';
              const selectedDateStr = selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : '';
              const isSelected =
                (!selectedDate && idx === 0) || (selectedDate && itemDateStr === selectedDateStr);

              return (
                <TouchableOpacity
                  key={item.dateKey || idx}
                  activeOpacity={0.75}
                  onPress={() => handleSelectDate(item)}
                  style={[
                    styles.historyPill,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    isSelected && {
                      backgroundColor: `${colors.primary}25`,
                      borderColor: colors.primaryLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.historyPillLabel,
                      { color: isSelected ? colors.primaryLight : colors.textSecondary },
                      isSelected && { fontWeight: typography.weights.bold },
                    ]}
                  >
                    {item.displayLabel || item.periodLabel}
                  </Text>
                  {item.memoryCount > 0 && (
                    <View
                      style={[
                        styles.historyCountBadge,
                        {
                          backgroundColor: isSelected ? colors.primaryLight : `${colors.primary}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyCountText,
                          { color: isSelected ? '#FFFFFF' : colors.primaryLight },
                        ]}
                      >
                        {item.memoryCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Main Recap Content */}
      {loading && !refreshing ? (
        <LoadingSpinner message="Generating AI memory recap..." fullScreen />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.huge },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primaryLight}
              colors={[colors.primaryLight]}
            />
          }
        >
          {/* Period Hero Card */}
          <Card variant="gradient" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.periodBadge}>
                <Ionicons
                  name={activeType === 'weekly' ? 'calendar' : 'today'}
                  size={12}
                  color={colors.primaryLight}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.periodBadgeText, { color: colors.primaryLight }]}>
                  {currentRecap?.periodLabel || (activeType === 'weekly' ? 'This Week' : 'Today')}
                </Text>
              </View>

              {isCached && (
                <View style={[styles.cachedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <Ionicons name="flash" size={10} color="#10B981" style={{ marginRight: 3 }} />
                  <Text style={styles.cachedBadgeText}>Cached in DB</Text>
                </View>
              )}
            </View>

            <Text style={[styles.headlineText, { color: colors.textPrimary }]}>
              {currentRecap?.headline || 'AI Memory Synthesis'}
            </Text>

            <Text style={[styles.overviewText, { color: colors.textSecondary }]}>
              {currentRecap?.overview ||
                'Here is a structured digest of your thoughts, learnings, accomplishments, and action items.'}
            </Text>

            {/* Quick Metrics Stats Bar */}
            <View style={[styles.statsRow, { borderTopColor: colors.borderLight }]}>
              <View style={styles.statMetric}>
                <Text style={[styles.statNumber, { color: colors.primaryLight }]}>
                  {stats.totalMemories || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Memories</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statMetric}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>
                  {sections.workCompleted?.length || stats.completedTasksCount || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statMetric}>
                <Text style={[styles.statNumber, { color: colors.amber }]}>
                  {sections.tasksPending?.length || stats.pendingTasksCount || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statMetric}>
                <Text style={[styles.statNumber, { color: '#EF4444' }]}>
                  {sections.upcomingDeadlines?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Deadlines</Text>
              </View>
            </View>
          </Card>

          {!hasAnyContent ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="mic-outline"
                title={`No memories for this ${activeType === 'weekly' ? 'week' : 'day'}`}
                message="Start recording voice memos to generate automatic AI recaps of your learnings, decisions, and tasks."
                actionTitle="Start Voice Recording"
                onAction={navigateToRecord}
              />
            </Card>
          ) : (
            <>
              {/* 1. IDEAS CAPTURED */}
              <RecapSectionCard
                title="Ideas Captured"
                icon="bulb-outline"
                themeColor="#A855F7"
                count={sections.ideasCaptured?.length || 0}
                items={sections.ideasCaptured || []}
                emptyText="No new ideas captured in this period."
                onNavigateMemory={navigateToMemory}
                colors={colors}
              />

              {/* 2. IMPORTANT THINGS LEARNED */}
              <RecapSectionCard
                title="Important Things Learned"
                icon="school-outline"
                themeColor="#06B6D4"
                count={sections.thingsLearned?.length || 0}
                items={sections.thingsLearned || []}
                emptyText="No study or learning notes logged in this period."
                onNavigateMemory={navigateToMemory}
                colors={colors}
              />

              {/* 3. WORK COMPLETED */}
              <RecapSectionCard
                title="Work Completed"
                icon="checkmark-done-circle-outline"
                themeColor="#10B981"
                count={sections.workCompleted?.length || 0}
                items={sections.workCompleted || []}
                emptyText="No completed work tasks recorded in this period."
                onNavigateMemory={navigateToMemory}
                colors={colors}
              />

              {/* 4. TASKS PENDING */}
              <RecapSectionCard
                title="Tasks Pending"
                icon="time-outline"
                themeColor="#F59E0B"
                count={sections.tasksPending?.length || 0}
                items={sections.tasksPending || []}
                isTaskSection={true}
                emptyText="All current tasks are completed! No pending items."
                onNavigateMemory={navigateToMemory}
                onNavigateTasks={navigateToTasks}
                colors={colors}
              />

              {/* 5. UPCOMING DEADLINES */}
              <RecapSectionCard
                title="Upcoming Deadlines"
                icon="alert-circle-outline"
                themeColor="#EF4444"
                count={sections.upcomingDeadlines?.length || 0}
                items={sections.upcomingDeadlines || []}
                isDeadlinesSection={true}
                emptyText="No upcoming deadlines detected."
                onNavigateMemory={navigateToMemory}
                colors={colors}
              />

              {/* 6. IMPORTANT DECISIONS */}
              <RecapSectionCard
                title="Important Decisions"
                icon="git-merge-outline"
                themeColor="#6366F1"
                count={sections.importantDecisions?.length || 0}
                items={sections.importantDecisions || []}
                emptyText="No explicit decisions recorded in this period."
                onNavigateMemory={navigateToMemory}
                colors={colors}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

/**
 * Reusable Section Card for each recap category
 */
const RecapSectionCard = ({
  title,
  icon,
  themeColor,
  count,
  items,
  emptyText,
  isTaskSection = false,
  isDeadlinesSection = false,
  onNavigateMemory,
  onNavigateTasks,
  colors,
}) => {
  return (
    <Card style={styles.sectionCard}>
      {/* Section Header */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.sectionIconWrap, { backgroundColor: `${themeColor}20` }]}>
            <Ionicons name={icon} size={16} color={themeColor} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>

        <View style={[styles.sectionCountBadge, { backgroundColor: `${themeColor}15` }]}>
          <Text style={[styles.sectionCountText, { color: themeColor }]}>{count}</Text>
        </View>
      </View>

      {/* Section Items */}
      {items.length === 0 ? (
        <Text style={[styles.sectionEmptyText, { color: colors.textMuted }]}>{emptyText}</Text>
      ) : (
        <View style={styles.itemsList}>
          {items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.itemRow,
                { borderBottomColor: colors.borderLight },
                idx === items.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={[styles.itemBullet, { backgroundColor: themeColor }]} />

              <View style={{ flex: 1 }}>
                <Text style={[styles.itemText, { color: colors.textPrimary }]}>
                  {item.text || item.title}
                </Text>

                {/* Priority / Due date badges for tasks */}
                {isTaskSection && item.priority && (
                  <View style={styles.taskMetaRow}>
                    <View
                      style={[
                        styles.priorityPill,
                        {
                          backgroundColor:
                            item.priority === 'urgent'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : item.priority === 'high'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          {
                            color:
                              item.priority === 'urgent'
                                ? '#EF4444'
                                : item.priority === 'high'
                                ? '#F59E0B'
                                : '#3B82F6',
                          },
                        ]}
                      >
                        {item.priority.toUpperCase()}
                      </Text>
                    </View>

                    {item.dueDate && (
                      <Text style={[styles.dueDateText, { color: colors.textSecondary }]}>
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}

                {/* Date badges for deadlines */}
                {isDeadlinesSection && item.dateText && (
                  <View style={styles.deadlineMetaRow}>
                    <Ionicons name="time" size={11} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={styles.deadlineMetaText}>{item.dateText}</Text>
                  </View>
                )}

                {/* Direct Link to Original Memory */}
                {item.memoryId && item.memoryTitle ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onNavigateMemory(item.memoryId)}
                    style={[
                      styles.memoryLinkChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name="link-outline"
                      size={11}
                      color={colors.primaryLight}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.memoryLinkLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                      Original Memory:{' '}
                      <Text style={{ color: colors.primaryLight, fontWeight: typography.weights.semibold }}>
                        {item.memoryTitle}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Link to Tasks module for pending tasks */}
                {isTaskSection && onNavigateTasks ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onNavigateTasks}
                    style={[
                      styles.memoryLinkChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name="checkbox-outline"
                      size={11}
                      color={colors.amber}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.memoryLinkLabel, { color: colors.textSecondary }]}>
                      Manage in <Text style={{ color: colors.amber, fontWeight: typography.weights.semibold }}>AI Task Manager →</Text>
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerSubtext: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  segmentBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  segmentBtnTextActive: {
    fontWeight: typography.weights.bold,
  },
  historyCarouselWrapper: {
    marginTop: 2,
    marginBottom: 4,
  },
  historyCarouselContent: {
    gap: 8,
    paddingVertical: 4,
  },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  historyPillLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  historyCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  historyCountText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroCard: {
    padding: spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  cachedBadgeText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: '#10B981',
  },
  headlineText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: 6,
  },
  overviewText: {
    fontSize: typography.sizes.xs,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  statMetric: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  statLabel: {
    fontSize: typography.sizes.xxs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  sectionCard: {
    padding: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  sectionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sectionCountText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  sectionEmptyText: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  itemText: {
    fontSize: typography.sizes.xs,
    lineHeight: 20,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  priorityText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  dueDateText: {
    fontSize: typography.sizes.xxs,
  },
  deadlineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deadlineMetaText: {
    fontSize: typography.sizes.xxs,
    color: '#EF4444',
    fontWeight: typography.weights.semibold,
  },
  memoryLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: 6,
  },
  memoryLinkLabel: {
    fontSize: typography.sizes.xxs,
  },
  emptyCard: {
    padding: spacing.xl,
  },
});

export default RecapScreen;
