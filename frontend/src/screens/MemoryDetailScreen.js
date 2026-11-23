import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { togglePin, toggleReminder, deleteMemory, fetchMemories } from '../store/slices/memorySlice';
import { scheduleNewReminder } from '../store/slices/reminderSlice';
import memoryApi from '../api/memoryApi';
import AudioPlayer from '../components/voice/AudioPlayer';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EntityChips from '../components/memory/EntityChips';
import CategoryPill from '../components/memory/CategoryPill';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { formatFullDate } from '../utils/dateFormatter';
import { getCategoryIcon } from '../utils/helpers';
import { ROUTES } from '../navigation/routes';

const EDITABLE_CATEGORIES = ['Ideas', 'Work', 'Study', 'Personal', 'Tasks'];

export const MemoryDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { memoryId } = route.params;
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const memories = useSelector((state) => state.memory.memories);

  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOriginalTranscript, setShowOriginalTranscript] = useState(false);
  const [isChangingCategory, setIsChangingCategory] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedDateForReminder, setSelectedDateForReminder] = useState(null);

  const handleScheduleMemoryReminder = (preset) => {
    const now = new Date();
    let remindTime = null;
    if (preset === '1h') {
      remindTime = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (preset === 'today_5pm') {
      remindTime = new Date(now);
      remindTime.setHours(17, 0, 0, 0);
      if (remindTime <= now) remindTime.setDate(remindTime.getDate() + 1);
    } else if (preset === 'tomorrow_9am') {
      remindTime = new Date(now);
      remindTime.setDate(remindTime.getDate() + 1);
      remindTime.setHours(9, 0, 0, 0);
    } else if (preset === 'in_2days') {
      remindTime = new Date(now);
      remindTime.setDate(remindTime.getDate() + 2);
      remindTime.setHours(10, 0, 0, 0);
    } else if (preset === 'extracted_date' && selectedDateForReminder) {
      if (selectedDateForReminder.parsedDate) {
        remindTime = new Date(selectedDateForReminder.parsedDate);
        if (remindTime <= now) {
          remindTime = new Date(now.getTime() + 60 * 60 * 1000);
        }
      } else {
        remindTime = new Date(now.getTime() + 60 * 60 * 1000);
      }
    }

    if (remindTime) {
      dispatch(
        scheduleNewReminder({
          title: `Voice Memo: ${memory.title}`,
          note: memory.summary || memory.transcript || 'Echo voice reminder',
          remindAt: remindTime.toISOString(),
          memoryId: memory._id,
          sourceType: 'memory',
        })
      );
      Alert.alert(
        'Reminder Scheduled',
        `Expo notification set for ${remindTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${remindTime.toLocaleDateString()}`
      );
    }
    setReminderModalVisible(false);
    setSelectedDateForReminder(null);
  };

  useEffect(() => {
    const localMatch = memories.find((m) => m._id === memoryId);
    if (localMatch) {
      setMemory(localMatch);
      setLoading(false);
    }

    memoryApi
      .getById(memoryId)
      .then((res) => {
        if (res.data) setMemory(res.data);
      })
      .catch((err) => console.warn('Detail fetch error:', err.message))
      .finally(() => setLoading(false));
  }, [memoryId, memories]);

  if (loading || !memory) {
    return <LoadingSpinner message="Loading memory details..." fullScreen />;
  }

  const categoryColor = colors.categories[memory.category] || colors.primary;

  const handleTogglePin = async () => {
    await dispatch(togglePin(memory._id));
    setMemory((prev) => ({ ...prev, isPinned: !prev.isPinned }));
  };

  const handleToggleReminderItem = async (reminderId) => {
    await dispatch(toggleReminder({ memoryId: memory._id, reminderId }));
    setMemory((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r._id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r
      ),
    }));
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to permanently delete this memory and its audio recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteMemory(memory._id));
            navigation.goBack();
          },
        },
      ]
    );
  };

  // User manually edits / changes category
  const handleChangeCategory = async (newCategory) => {
    try {
      const res = await memoryApi.update(memory._id, { category: newCategory });
      if (res.data) {
        setMemory(res.data);
        dispatch(fetchMemories());
      }
      setIsChangingCategory(false);
    } catch (err) {
      Alert.alert('Error', 'Could not update category.');
    }
  };

  const peopleEntities = (memory.entities || []).filter((e) => e.type === 'person');
  const projectEntities = (memory.entities || []).filter((e) => e.type === 'project');
  const otherEntities = (memory.entities || []).filter((e) => e.type !== 'person' && e.type !== 'project');

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
        {/* Top Header Card */}
        <Card variant="gradient" style={styles.topCard}>
          <View style={styles.categoryRow}>
            {/* Category with Tap-to-Change shortcut */}
            <TouchableOpacity
              onPress={() => setIsChangingCategory(!isChangingCategory)}
              style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}
            >
              <Ionicons
                name={getCategoryIcon(memory.category)}
                size={13}
                color={categoryColor}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {memory.category}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={categoryColor}
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDateForReminder(null);
                  setReminderModalVisible(true);
                }}
                style={[
                  styles.pinButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={16}
                  color={colors.amber}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTogglePin}
                style={[
                  styles.pinButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  memory.isPinned && { backgroundColor: colors.amber, borderColor: colors.amber },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={memory.isPinned ? 'pin' : 'pin-outline'}
                  size={16}
                  color={memory.isPinned ? '#FFFFFF' : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline Category Switcher Selector */}
          {isChangingCategory && (
            <View style={[styles.categorySwitcherRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>Change Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {EDITABLE_CATEGORIES.map((cat) => (
                  <CategoryPill
                    key={cat}
                    category={cat}
                    isSelected={memory.category === cat}
                    onPress={() => handleChangeCategory(cat)}
                    size="sm"
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={[styles.title, { color: colors.textPrimary }]}>{memory.title}</Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>{formatFullDate(memory.createdAt)}</Text>
        </Card>

        {/* Audio Player Bar */}
        {memory.audioUrl && (
          <AudioPlayer
            audioUrl={memory.audioUrl}
            duration={memory.audioDuration || 14}
            title="Recorded Voice Memo"
            style={styles.audioPlayer}
          />
        )}

        {/* AI Clean Summary Card */}
        {memory.summary ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="sparkles" size={15} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>AI Clean Summary</Text>
            </View>
            <Text style={[styles.summaryText, { color: colors.textPrimary }]}>{memory.summary}</Text>
          </Card>
        ) : null}

        {/* Main Points / Key Takeaways */}
        {memory.mainPoints && memory.mainPoints.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="list-outline" size={16} color={colors.cyan} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Main Points & Takeaways</Text>
            </View>
            <View style={styles.pointsList}>
              {memory.mainPoints.map((pt, i) => (
                <View key={i} style={styles.pointItemRow}>
                  <View style={[styles.pointBullet, { backgroundColor: colors.cyan }]} />
                  <Text style={[styles.pointText, { color: colors.textPrimary }]}>{pt}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Important Dates & Deadlines */}
        {memory.datesAndDeadlines && memory.datesAndDeadlines.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.amber} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Important Dates & Deadlines</Text>
            </View>
            <View style={styles.deadlinesList}>
              {memory.datesAndDeadlines.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.75}
                  onPress={() => {
                    setSelectedDateForReminder(d);
                    setReminderModalVisible(true);
                  }}
                  style={[styles.deadlineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.deadlineIconWrap, { backgroundColor: colors.amber + '20' }]}>
                    <Ionicons name="time" size={16} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deadlineDate, { color: colors.amber }]}>{d.dateText}</Text>
                    {d.context ? (
                      <Text style={[styles.deadlineContext, { color: colors.textSecondary }]}>{d.context}</Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="notifications-outline" size={13} color={colors.amber} />
                    <Text style={{ fontSize: typography.sizes.xxs, color: colors.amber, fontWeight: typography.weights.semibold }}>
                      Remind
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Action Items Checklist */}
        {memory.actionItems && memory.actionItems.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="checkbox-outline" size={16} color={colors.emerald} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Extracted Action Items</Text>
            </View>
            {memory.actionItems.map((action, i) => (
              <View key={i} style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}>
                <Ionicons name="arrow-forward-circle" size={16} color={colors.emerald} style={{ marginRight: 8 }} />
                <Text style={[styles.actionText, { color: colors.textPrimary }]}>{action}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* People & Projects Mentioned */}
        {(peopleEntities.length > 0 || projectEntities.length > 0) && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people-outline" size={16} color={colors.accentLight} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>People & Projects Mentioned</Text>
            </View>

            {peopleEntities.length > 0 && (
              <View style={{ marginBottom: projectEntities.length > 0 ? 8 : 0 }}>
                <Text style={[styles.subSectionLabel, { color: colors.textSecondary }]}>People</Text>
                <View style={styles.entityWrap}>
                  {peopleEntities.map((p, i) => (
                    <View key={i} style={[styles.namedChip, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
                      <Ionicons name="person" size={12} color={colors.primaryLight} style={{ marginRight: 4 }} />
                      <Text style={[styles.namedChipText, { color: colors.primaryLight }]}>{p.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {projectEntities.length > 0 && (
              <View>
                <Text style={[styles.subSectionLabel, { color: colors.textSecondary }]}>Projects</Text>
                <View style={styles.entityWrap}>
                  {projectEntities.map((proj, i) => (
                    <View key={i} style={[styles.namedChip, { backgroundColor: colors.cyan + '18', borderColor: colors.cyan }]}>
                      <Ionicons name="briefcase" size={12} color={colors.cyan} style={{ marginRight: 4 }} />
                      <Text style={[styles.namedChipText, { color: colors.cyan }]}>{proj.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Other Entities & Locations */}
        {otherEntities.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="cube-outline" size={15} color={colors.cyan} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Entities & Locations</Text>
            </View>
            <EntityChips entities={otherEntities} maxDisplay={10} />
          </Card>
        )}

        {/* Voice Transcript Card with Original Preservation Toggle */}
        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={15} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Voice Transcript</Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate(ROUTES.TRANSCRIPTION_REVIEW, {
                  memoryId: memory._id,
                  audioUrl: memory.audioUrl,
                  initialTranscript: memory.transcript,
                  initialTitle: memory.title,
                  initialCategory: memory.category,
                  initialLanguage: memory.language || 'en',
                  transcriptionStatus: memory.transcriptionStatus || 'completed',
                  transcriptionError: memory.transcriptionError,
                })
              }
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="create-outline" size={14} color={colors.primaryLight} />
              <Text style={{ fontSize: typography.sizes.xs, color: colors.primaryLight, fontWeight: typography.weights.bold }}>
                Edit / Retry STT
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transcript Body */}
          <Text style={[styles.transcriptText, { color: colors.textSecondary }]}>
            {showOriginalTranscript && memory.originalTranscript
              ? memory.originalTranscript
              : memory.transcript}
          </Text>

          {/* Preserve Original Transcript Toggle */}
          {memory.originalTranscript && memory.editedByUser && (
            <TouchableOpacity
              onPress={() => setShowOriginalTranscript(!showOriginalTranscript)}
              style={[styles.originalToggleBtn, { borderColor: colors.border }]}
            >
              <Ionicons
                name={showOriginalTranscript ? 'eye-off-outline' : 'eye-outline'}
                size={14}
                color={colors.primaryLight}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.originalToggleText, { color: colors.primaryLight }]}>
                {showOriginalTranscript
                  ? 'Showing Original Audio Transcript • Tap to view edited'
                  : 'User edited transcript • Tap to view unedited original words'}
              </Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Tags / Keywords */}
        {memory.tags && memory.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {memory.tags.map((t, idx) => (
              <View
                key={idx}
                style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Delete Button */}
        <Button
          title="Delete Memory"
          variant="danger"
          size="md"
          icon="trash-outline"
          onPress={handleDelete}
          style={styles.deleteButton}
        />
      </ScrollView>

      {/* Voice Memory Reminder Modal */}
      <Modal
        visible={reminderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setReminderModalVisible(false);
          setSelectedDateForReminder(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="notifications" size={20} color={colors.amber} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                Set Voice Reminder
              </Text>
            </View>

            <Text style={[styles.modalSubtitleText, { color: colors.textSecondary }]}>
              {selectedDateForReminder
                ? `Schedule reminder for mentioned date "${selectedDateForReminder.dateText}":`
                : `Schedule reminder for "${memory?.title}":`}
            </Text>

            <View style={styles.presetGrid}>
              {selectedDateForReminder && (
                <TouchableOpacity
                  onPress={() => handleScheduleMemoryReminder('extracted_date')}
                  style={[styles.presetBtn, { backgroundColor: colors.amber + '18', borderColor: colors.amber }]}
                >
                  <Ionicons name="calendar" size={16} color={colors.amber} style={{ marginBottom: 4 }} />
                  <Text style={[styles.presetBtnText, { color: colors.amber }]}>
                    Exact Date: {selectedDateForReminder.dateText}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleScheduleMemoryReminder('1h')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="time-outline" size={16} color={colors.primaryLight} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>In 1 Hour</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleScheduleMemoryReminder('today_5pm')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="sunny-outline" size={16} color={colors.amber} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Today at 5:00 PM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleScheduleMemoryReminder('tomorrow_9am')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primaryLight} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Tomorrow at 9 AM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleScheduleMemoryReminder('in_2days')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="alarm-outline" size={16} color={colors.primaryLight} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>In 2 Days</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setReminderModalVisible(false);
                setSelectedDateForReminder(null);
              }}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
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
  topCard: {
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  categorySwitcherRow: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: 6,
  },
  switchLabel: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.semibold,
  },
  pinButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: 28,
    marginBottom: 6,
  },
  date: {
    fontSize: typography.sizes.xs,
  },
  audioPlayer: {
    marginBottom: spacing.md,
  },
  sectionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  summaryText: {
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },
  pointsList: {
    gap: 8,
  },
  pointItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  pointText: {
    fontSize: typography.sizes.xs,
    lineHeight: 20,
    flex: 1,
  },
  deadlinesList: {
    gap: 8,
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
  },
  deadlineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadlineDate: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  deadlineContext: {
    fontSize: typography.sizes.xxs,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  subSectionLabel: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  namedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  namedChipText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.semibold,
  },
  transcriptText: {
    fontSize: typography.sizes.xs,
    lineHeight: 22,
  },
  originalToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  originalToggleText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.lg,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.medium,
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  modalSubtitleText: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  presetGrid: {
    gap: 8,
    marginBottom: spacing.md,
  },
  presetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  cancelBtn: {
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});

export default MemoryDetailScreen;
