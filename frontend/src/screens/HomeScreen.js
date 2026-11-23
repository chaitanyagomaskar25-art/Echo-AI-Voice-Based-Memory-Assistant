import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchMemories, togglePin, deleteMemory, toggleReminder } from '../store/slices/memorySlice';
import MemoryCard from '../components/memory/MemoryCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { MemoryCardSkeleton } from '../components/common/SkeletonLoader';
import QuickNoteModal from '../components/memory/QuickNoteModal';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { ROUTES } from '../navigation/routes';
import { getCategoryIcon } from '../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURED_CATEGORIES = ['Ideas', 'Work', 'Study', 'Personal', 'Tasks'];

export const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark, toggleTheme } = useTheme();

  const { memories, loading } = useSelector((state) => state.memory);
  const user = useSelector((state) => state.auth.user);

  const [quickNoteVisible, setQuickNoteVisible] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [taskFilter, setTaskFilter] = useState('pending'); // 'all' | 'pending' | 'completed'

  // Animation values for large recording button and pulse waves
  const pulseRing1 = useRef(new Animated.Value(1)).current;
  const pulseRing2 = useRef(new Animated.Value(1)).current;
  const micButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous subtle breathing waves on large record button
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseRing1, {
            toValue: 1.25,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseRing1, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseRing2, {
            toValue: 1.45,
            duration: 2400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseRing2, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const loadData = useCallback(() => {
    dispatch(fetchMemories());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Greeting by time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'Explorer';

  // Compute category counts
  const categoryCounts = FEATURED_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = memories.filter((m) => m.category === cat).length;
    return acc;
  }, {});

  // Extract all reminders / tasks from memories
  const allTasks = [];
  memories.forEach((mem) => {
    (mem.reminders || []).forEach((rem) => {
      allTasks.push({
        memoryId: mem._id,
        memoryTitle: mem.title,
        category: mem.category,
        reminderId: rem._id,
        title: rem.title,
        isCompleted: rem.isCompleted,
        remindAt: rem.remindAt,
      });
    });
  });

  const completedTasks = allTasks.filter((t) => t.isCompleted);
  const pendingTasks = allTasks.filter((t) => !t.isCompleted);

  const displayedTasks =
    taskFilter === 'completed'
      ? completedTasks
      : taskFilter === 'pending'
      ? pendingTasks
      : allTasks;

  const taskCompletionRate =
    allTasks.length > 0
      ? Math.round((completedTasks.length / allTasks.length) * 100)
      : 0;

  // Filter recent memories by category if chosen
  const filteredMemories =
    selectedCategoryFilter === 'All'
      ? memories
      : memories.filter((m) => m.category === selectedCategoryFilter);

  const recentMemories = filteredMemories.slice(0, 5);

  // Daily Memory Briefing synthesis
  const generateDailyBriefing = () => {
    if (memories.length === 0) {
      return 'No memories recorded yet. Tap the large button below to record your first voice thought!';
    }
    const categoriesUsed = [
      ...new Set(memories.slice(0, 5).map((m) => m.category)),
    ];
    return `You have ${memories.length} memories stored across ${
      categoriesUsed.join(', ') || 'various areas'
    }. ${
      pendingTasks.length > 0
        ? `You have ${pendingTasks.length} pending task${
            pendingTasks.length > 1 ? 's' : ''
          } awaiting completion.`
        : 'All current action items are completed.'
    }`;
  };

  const handleRecordPressIn = () => {
    Animated.spring(micButtonScale, {
      toValue: 0.94,
      useNativeDriver: true,
    }).start();
  };

  const handleRecordPressOut = () => {
    Animated.spring(micButtonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor={colors.primaryLight}
            colors={[colors.primaryLight]}
          />
        }
      >
        {/* Top Header: Personalized Greeting & Profile Shortcut */}
        <View style={styles.headerRow}>
          <View style={styles.greetingWrap}>
            <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
              {getGreeting()}, {userName}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={toggleTheme}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={colors.primaryLight}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.profileAvatarBtn,
                {
                  backgroundColor: colors.primary + '20',
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => navigation.navigate(ROUTES.SETTINGS)}
            >
              <Ionicons
                name={
                  user?.avatar === 'sparkles'
                    ? 'sparkles'
                    : user?.avatar === 'mic'
                    ? 'mic'
                    : user?.avatar === 'brain'
                    ? 'bulb-outline'
                    : 'person-outline'
                }
                size={18}
                color={colors.primaryLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Search Memories Entry Point */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.MEMORIES)}
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textSecondary}
            style={{ marginRight: 10 }}
          />
          <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
            Search memories, places, decisions, ideas...
          </Text>
          <View
            style={[
              styles.searchIconBadge,
              { backgroundColor: colors.primary + '18' },
            ]}
          >
            <Ionicons name="sparkles" size={13} color={colors.primaryLight} />
          </View>
        </TouchableOpacity>

        {/* 2. Daily Memory Summary Card */}
        <Card variant="gradient" style={styles.briefingCard}>
          <View style={styles.briefingHeader}>
            <View style={styles.briefingBadgeRow}>
              <View
                style={[
                  styles.aiPulseDot,
                  { backgroundColor: colors.primaryLight },
                ]}
              />
              <Text
                style={[
                  styles.briefingBadgeText,
                  { color: colors.primaryLight },
                ]}
              >
                DAILY MEMORY BRIEFING
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.ASK_ECHO)}
              style={styles.askEchoLink}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={14}
                color={colors.primaryLight}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[styles.askEchoLinkText, { color: colors.primaryLight }]}
              >
                Ask Echo
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.briefingContent, { color: colors.textPrimary }]}
          >
            {generateDailyBriefing()}
          </Text>

          <View style={styles.briefingFooter}>
            <View style={styles.briefingMetric}>
              <Text
                style={[styles.metricNumber, { color: colors.textPrimary }]}
              >
                {memories.length}
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Memories
              </Text>
            </View>
            <View
              style={[
                styles.metricDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <View style={styles.briefingMetric}>
              <Text
                style={[styles.metricNumber, { color: colors.amber }]}
              >
                {pendingTasks.length}
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Pending Tasks
              </Text>
            </View>
            <View
              style={[
                styles.metricDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <View style={styles.briefingMetric}>
              <Text
                style={[styles.metricNumber, { color: colors.emerald }]}
              >
                {completedTasks.length}
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Completed
              </Text>
            </View>
          </View>

          {/* Quick link to AI Generated Daily & Weekly Recap */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.RECAP)}
            style={[
              styles.viewRecapButton,
              {
                backgroundColor: `${colors.primary}20`,
                borderColor: `${colors.primary}45`,
              },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={14}
              color={colors.primaryLight}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.viewRecapText, { color: colors.primaryLight }]}>
              View AI Daily & Weekly Recap
            </Text>
            <Ionicons
              name="arrow-forward"
              size={13}
              color={colors.primaryLight}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </Card>

        {/* 3. Hero Recording & Quick Note Section (One-Hand Accessible) */}
        <View style={styles.heroActionZone}>
          {/* Large Animated Start Recording Button */}
          <Card
            style={[
              styles.recordHeroCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.borderActive,
              },
            ]}
          >
            <View style={styles.recordHeroDetails}>
              <Badge
                label="Instant Voice Capture"
                variant="primary"
                icon="mic"
                size="sm"
              />
              <Text
                style={[styles.recordHeroTitle, { color: colors.textPrimary }]}
              >
                Voice your thoughts
              </Text>
              <Text
                style={[
                  styles.recordHeroSub,
                  { color: colors.textSecondary },
                ]}
              >
                Echo transcribes, tags entities, and extracts action items
                automatically.
              </Text>
            </View>

            {/* Pulsing Mic Visualizer */}
            <View style={styles.micVisualizerWrap}>
              <Animated.View
                style={[
                  styles.micPulseRing,
                  {
                    borderColor: colors.primaryLight + '35',
                    transform: [{ scale: pulseRing2 }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.micPulseRing,
                  {
                    borderColor: colors.primary + '50',
                    transform: [{ scale: pulseRing1 }],
                  },
                ]}
              />

              <TouchableOpacity
                activeOpacity={0.88}
                onPressIn={handleRecordPressIn}
                onPressOut={handleRecordPressOut}
                onPress={() => navigation.navigate(ROUTES.RECORD)}
              >
                <Animated.View
                  style={[
                    styles.micButtonAnimated,
                    { transform: [{ scale: micButtonScale }] },
                  ]}
                >
                  <LinearGradient
                    colors={colors.gradientRecord || ['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.micGradient}
                  >
                    <Ionicons name="mic" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Quick Text Note Option */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setQuickNoteVisible(true)}
            style={[
              styles.quickNoteBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.quickNoteIconWrap,
                { backgroundColor: colors.accent + '20' },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.accentLight}
              />
            </View>
            <View style={styles.quickNoteTextWrap}>
              <Text
                style={[styles.quickNoteTitle, { color: colors.textPrimary }]}
              >
                Quick Text Note
              </Text>
              <Text
                style={[styles.quickNoteSub, { color: colors.textSecondary }]}
              >
                Write and save a note without recording audio
              </Text>
            </View>
            <Ionicons
              name="add-circle"
              size={22}
              color={colors.primaryLight}
            />
          </TouchableOpacity>
        </View>

        {/* 4. Memory Categories (Ideas, Work, Study, Personal, Tasks) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="grid-outline"
                size={16}
                color={colors.primaryLight}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Memory Categories
              </Text>
            </View>
            {selectedCategoryFilter !== 'All' && (
              <TouchableOpacity
                onPress={() => setSelectedCategoryFilter('All')}
              >
                <Text
                  style={[styles.resetFilterText, { color: colors.primaryLight }]}
                >
                  Show All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {FEATURED_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategoryFilter === cat;
              const catColor = colors.categories[cat] || colors.primary;

              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.75}
                  onPress={() => {
                    setSelectedCategoryFilter(isSelected ? 'All' : cat);
                  }}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isSelected
                        ? catColor + '20'
                        : colors.surface,
                      borderColor: isSelected ? catColor : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryCardIconWrap,
                      { backgroundColor: catColor + '22' },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(cat)}
                      size={20}
                      color={catColor}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryCardTitle,
                      {
                        color: isSelected ? catColor : colors.textPrimary,
                        fontWeight: isSelected
                          ? typography.weights.bold
                          : typography.weights.semibold,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                  <Text
                    style={[
                      styles.categoryCardCount,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {count} {count === 1 ? 'memo' : 'memos'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 5. Today's Completed and Pending Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={18}
                color={colors.emerald}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Today's Tasks & Actions
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.TASKS)}
                style={{ marginLeft: 8 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 11, color: colors.primaryLight, fontWeight: typography.weights.semibold }}>
                  Task Manager →
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.taskFilterPills}>
              {['pending', 'completed', 'all'].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setTaskFilter(f)}
                  style={[
                    styles.taskFilterPill,
                    {
                      backgroundColor:
                        taskFilter === f
                          ? colors.primary + '20'
                          : colors.surface,
                      borderColor:
                        taskFilter === f ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.taskFilterText,
                      {
                        color:
                          taskFilter === f
                            ? colors.primaryLight
                            : colors.textSecondary,
                        fontWeight:
                          taskFilter === f
                            ? typography.weights.bold
                            : typography.weights.medium,
                      },
                    ]}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Progress Indicator */}
          {allTasks.length > 0 && (
            <Card style={styles.taskProgressCard}>
              <View style={styles.progressBarWrap}>
                <View
                  style={[
                    styles.progressBarTrack,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${taskCompletionRate}%`,
                        backgroundColor: colors.emerald,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.progressPercentage,
                    { color: colors.textPrimary },
                  ]}
                >
                  {taskCompletionRate}%
                </Text>
              </View>
              <Text
                style={[styles.progressSubtitle, { color: colors.textSecondary }]}
              >
                {completedTasks.length} of {allTasks.length} tasks completed
              </Text>
            </Card>
          )}

          {/* Tasks List */}
          {displayedTasks.length > 0 ? (
            <View style={styles.tasksList}>
              {displayedTasks.map((task) => (
                <TouchableOpacity
                  key={`${task.memoryId}-${task.reminderId}`}
                  activeOpacity={0.7}
                  onPress={() => {
                    dispatch(
                      toggleReminder({
                        memoryId: task.memoryId,
                        reminderId: task.reminderId,
                      })
                    );
                  }}
                  style={[
                    styles.taskItemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.taskCheckbox,
                      {
                        borderColor: task.isCompleted
                          ? colors.emerald
                          : colors.border,
                        backgroundColor: task.isCompleted
                          ? colors.emerald
                          : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      dispatch(
                        toggleReminder({
                          memoryId: task.memoryId,
                          reminderId: task.reminderId,
                        })
                      );
                    }}
                  >
                    {task.isCompleted && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>

                  <View style={styles.taskDetails}>
                    <Text
                      style={[
                        styles.taskTitle,
                        {
                          color: task.isCompleted
                            ? colors.textMuted
                            : colors.textPrimary,
                          textDecorationLine: task.isCompleted
                            ? 'line-through'
                            : 'none',
                        },
                      ]}
                    >
                      {task.title}
                    </Text>
                    <View style={styles.taskMetaRow}>
                      <View
                        style={[
                          styles.taskCatDot,
                          {
                            backgroundColor:
                              colors.categories[task.category] ||
                              colors.primary,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.taskMemoryName,
                          { color: colors.textSecondary },
                        ]}
                      >
                        From: {task.memoryTitle}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Card style={styles.emptyTasksCard}>
              <Ionicons
                name="sparkles-outline"
                size={24}
                color={colors.primaryLight}
                style={{ marginBottom: 6 }}
              />
              <Text
                style={[styles.emptyTasksTitle, { color: colors.textPrimary }]}
              >
                {taskFilter === 'pending'
                  ? 'All pending tasks completed!'
                  : taskFilter === 'completed'
                  ? 'No completed tasks yet.'
                  : 'No tasks extracted yet.'}
              </Text>
              <Text
                style={[styles.emptyTasksSub, { color: colors.textSecondary }]}
              >
                Record a voice memo mentioning actions or reminders to populate
                tasks.
              </Text>
            </Card>
          )}
        </View>

        {/* 6. Recently Captured Memories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.cyan}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Recently Captured Memories
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.MEMORIES)}
            >
              <Text
                style={[styles.seeAllLink, { color: colors.primaryLight }]}
              >
                See All ({filteredMemories.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skeleton Loaders or Content */}
          {loading && memories.length === 0 ? (
            <View>
              <MemoryCardSkeleton />
              <MemoryCardSkeleton />
            </View>
          ) : recentMemories.length > 0 ? (
            recentMemories.map((item) => (
              <MemoryCard
                key={item._id}
                memory={item}
                onPress={() =>
                  navigation.navigate(ROUTES.MEMORY_DETAIL, {
                    memoryId: item._id,
                  })
                }
                onTogglePin={(id) => dispatch(togglePin(id))}
                onDelete={(id) => dispatch(deleteMemory(id))}
              />
            ))
          ) : (
            <EmptyState
              icon="mic-outline"
              title="No memories found"
              message={
                selectedCategoryFilter !== 'All'
                  ? `No memories tagged under ${selectedCategoryFilter} yet.`
                  : 'Start speaking or create a quick note to store your first memory.'
              }
              actionLabel="Record Voice Memory"
              onAction={() => navigation.navigate(ROUTES.RECORD)}
            />
          )}
        </View>
      </ScrollView>

      {/* Quick Note Modal */}
      <QuickNoteModal
        visible={quickNoteVisible}
        onClose={() => setQuickNoteVisible(false)}
      />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greetingWrap: {
    flex: 1,
  },
  greetingSub: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  searchIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefingCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  briefingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  briefingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  briefingBadgeText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  askEchoLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  askEchoLinkText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  briefingContent: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  briefingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  briefingMetric: {
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  metricLabel: {
    fontSize: typography.sizes.xxs,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  viewRecapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  viewRecapText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  heroActionZone: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  recordHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
  },
  recordHeroDetails: {
    flex: 1,
    paddingRight: spacing.sm,
    gap: 4,
  },
  recordHeroTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
    marginTop: 4,
  },
  recordHeroSub: {
    fontSize: typography.sizes.xs,
    lineHeight: 17,
  },
  micVisualizerWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  micButtonAnimated: {
    shadowColor: '#EF4444',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  micGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  quickNoteIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNoteTextWrap: {
    flex: 1,
  },
  quickNoteTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  quickNoteSub: {
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  resetFilterText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  categoryScroll: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  categoryCard: {
    width: 104,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  categoryCardTitle: {
    fontSize: typography.sizes.xs,
  },
  categoryCardCount: {
    fontSize: typography.sizes.xxs,
  },
  taskFilterPills: {
    flexDirection: 'row',
    gap: 4,
  },
  taskFilterPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  taskFilterText: {
    fontSize: typography.sizes.xxs,
  },
  taskProgressCard: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  progressSubtitle: {
    fontSize: typography.sizes.xxs,
  },
  tasksList: {
    gap: 8,
  },
  taskItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
  },
  taskCatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskMemoryName: {
    fontSize: typography.sizes.xxs,
  },
  emptyTasksCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyTasksTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  emptyTasksSub: {
    fontSize: typography.sizes.xxs,
    textAlign: 'center',
    marginTop: 3,
  },
  seeAllLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});

export default HomeScreen;
