import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  togglePin,
  toggleFavorite,
  toggleArchive,
  toggleReminder,
  deleteMemory,
  fetchMemories,
} from '../store/slices/memorySlice';
import { toggleTaskComplete } from '../store/slices/taskSlice';
import { scheduleNewReminder } from '../store/slices/reminderSlice';
import memoryApi from '../api/memoryApi';
import taskApi from '../api/taskApi';
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

  // Edit Memory Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [editCategory, setEditCategory] = useState('Personal');
  const [editTags, setEditTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Related Tasks State
  const [relatedTasks, setRelatedTasks] = useState([]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Fetch memory details and related tasks
  const loadMemoryDetails = useCallback(() => {
    const localMatch = memories.find((m) => m._id === memoryId);
    if (localMatch) {
      setMemory(localMatch);
      setLoading(false);
    }

    memoryApi
      .getById(memoryId)
      .then((res) => {
        if (res.data?.data) {
          setMemory(res.data.data);
          if (Array.isArray(res.data.data.relatedTasks)) {
            setRelatedTasks(res.data.data.relatedTasks);
          }
        } else if (res.data) {
          setMemory(res.data);
        }
      })
      .catch((err) => console.warn('Detail fetch error:', err.message))
      .finally(() => setLoading(false));

    // Fetch related tasks explicitly
    memoryApi
      .getRelatedTasks(memoryId)
      .then((res) => {
        const tasks = res.data?.data || res.data || [];
        if (Array.isArray(tasks) && tasks.length > 0) {
          setRelatedTasks(tasks);
        }
      })
      .catch(() => {});
  }, [memoryId, memories]);

  useEffect(() => {
    loadMemoryDetails();
  }, [loadMemoryDetails]);

  if (loading || !memory) {
    return <LoadingSpinner message="Loading memory details..." fullScreen />;
  }

  const categoryColor = colors.categories[memory.category] || colors.primary;

  const handleTogglePin = async () => {
    await dispatch(togglePin(memory._id));
    setMemory((prev) => ({ ...prev, isPinned: !prev.isPinned }));
  };

  const handleToggleFavorite = async () => {
    await dispatch(toggleFavorite(memory._id));
    setMemory((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
  };

  const handleToggleArchive = async () => {
    await dispatch(toggleArchive(memory._id));
    const nextArchived = !memory.isArchived;
    setMemory((prev) => ({ ...prev, isArchived: nextArchived }));
    Alert.alert(
      nextArchived ? 'Memory Archived' : 'Memory Restored',
      nextArchived
        ? 'This memory has been moved to your archive. You can access it from the Archived tab.'
        : 'This memory has been restored to your active memory library.'
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to permanently delete this memory, its transcript and audio?',
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

  // Open Edit Modal
  const openEditModal = () => {
    setEditTitle(memory.title);
    setEditSummary(memory.summary || '');
    setEditTranscript(memory.transcript || '');
    setEditCategory(memory.category || 'Personal');
    setEditTags(Array.isArray(memory.tags) ? [...memory.tags] : []);
    setNewTagInput('');
    setEditModalVisible(true);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Validation Error', 'Title cannot be empty.');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await memoryApi.update(memory._id, {
        title: editTitle.trim(),
        summary: editSummary.trim(),
        transcript: editTranscript.trim(),
        category: editCategory,
        tags: editTags,
      });

      if (res.data?.data) {
        setMemory(res.data.data);
      } else if (res.data) {
        setMemory(res.data);
      }
      dispatch(fetchMemories());
      setEditModalVisible(false);
      Alert.alert('Memory Updated', 'Your edits have been saved.');
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Tag Management in Edit Modal
  const handleAddTag = () => {
    const cleanTag = newTagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanTag && !editTags.includes(cleanTag)) {
      setEditTags([...editTags, cleanTag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditTags(editTags.filter((t) => t !== tagToRemove));
  };

  // Toggle completion of a related task
  const handleToggleTaskComplete = async (taskId) => {
    await dispatch(toggleTaskComplete(taskId));
    setRelatedTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  // Quick Add Related Task
  const handleCreateRelatedTask = async () => {
    if (!newTaskInput.trim()) return;
    try {
      const res = await taskApi.create({
        title: newTaskInput.trim(),
        memory: memory._id,
        category: memory.category || 'Tasks',
        priority: 'medium',
      });
      const created = res.data?.data || res.data;
      if (created) {
        setRelatedTasks((prev) => [created, ...prev]);
        setNewTaskInput('');
        setIsAddingTask(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not create task.');
    }
  };

  // Voice Reminder preset schedule
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
        `Notification set for ${remindTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${remindTime.toLocaleDateString()}`
      );
    }
    setReminderModalVisible(false);
    setSelectedDateForReminder(null);
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

            {/* Quick Action Toolbar: Edit, Favorite, Pin, Archive, Reminder */}
            <View style={styles.headerActionToolbar}>
              {/* Edit Button */}
              <TouchableOpacity
                onPress={openEditModal}
                style={[styles.actionIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="pencil-outline" size={15} color={colors.primaryLight} />
              </TouchableOpacity>

              {/* Favorite Button */}
              <TouchableOpacity
                onPress={handleToggleFavorite}
                style={[
                  styles.actionIconBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  memory.isFavorite && { backgroundColor: '#EAB308' + '25', borderColor: '#EAB308' },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons
                  name={memory.isFavorite ? 'star' : 'star-outline'}
                  size={15}
                  color={memory.isFavorite ? '#EAB308' : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Pin Button */}
              <TouchableOpacity
                onPress={handleTogglePin}
                style={[
                  styles.actionIconBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  memory.isPinned && { backgroundColor: colors.amber + '25', borderColor: colors.amber },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons
                  name={memory.isPinned ? 'pin' : 'pin-outline'}
                  size={15}
                  color={memory.isPinned ? colors.amber : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Archive Button */}
              <TouchableOpacity
                onPress={handleToggleArchive}
                style={[
                  styles.actionIconBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  memory.isArchived && { backgroundColor: `${colors.primary}25`, borderColor: colors.primaryLight },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons
                  name={memory.isArchived ? 'archive' : 'archive-outline'}
                  size={15}
                  color={memory.isArchived ? colors.primaryLight : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Reminder Bell Button */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedDateForReminder(null);
                  setReminderModalVisible(true);
                }}
                style={[styles.actionIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="notifications-outline" size={15} color={colors.amber} />
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
                    onPress={async () => {
                      const res = await memoryApi.update(memory._id, { category: cat });
                      if (res.data) setMemory(res.data?.data || res.data);
                      setIsChangingCategory(false);
                      dispatch(fetchMemories());
                    }}
                    size="sm"
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Archived Banner if applicable */}
          {memory.isArchived && (
            <View style={[styles.archivedBanner, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}>
              <Ionicons name="archive" size={13} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={[styles.archivedBannerText, { color: colors.primaryLight }]}>
                This memory is archived. Tap the archive icon above to restore.
              </Text>
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

        {/* Related Actionable Tasks Section */}
        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkbox-outline" size={16} color={colors.amber} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Related Tasks ({relatedTasks.length})
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsAddingTask(!isAddingTask)}
              style={styles.addTaskHeaderBtn}
            >
              <Ionicons
                name={isAddingTask ? 'close' : 'add-circle-outline'}
                size={16}
                color={colors.primaryLight}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.addTaskHeaderText, { color: colors.primaryLight }]}>
                {isAddingTask ? 'Cancel' : 'Add Task'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Add Task Input */}
          {isAddingTask && (
            <View style={[styles.quickTaskInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={newTaskInput}
                onChangeText={setNewTaskInput}
                placeholder="Action item / task to link..."
                placeholderTextColor={colors.textMuted}
                style={[styles.quickTaskTextInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity
                onPress={handleCreateRelatedTask}
                style={[styles.quickTaskSubmitBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.quickTaskSubmitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Related Tasks List */}
          {relatedTasks.length === 0 ? (
            <Text style={[styles.emptyTasksNote, { color: colors.textMuted }]}>
              No tasks linked to this voice memo yet. Tap "+ Add Task" to create one.
            </Text>
          ) : (
            <View style={styles.tasksListWrap}>
              {relatedTasks.map((task) => (
                <View
                  key={task._id}
                  style={[
                    styles.relatedTaskItemRow,
                    { borderBottomColor: colors.borderLight },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleToggleTaskComplete(task._id)}
                    style={styles.taskCheckboxTouch}
                  >
                    <Ionicons
                      name={task.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={task.isCompleted ? '#10B981' : colors.textMuted}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.relatedTaskTitle,
                        { color: colors.textPrimary },
                        task.isCompleted && styles.taskCompletedText,
                      ]}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>

                    {task.dueDate && (
                      <Text style={[styles.relatedTaskDate, { color: colors.textSecondary }]}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  {task.priority && (
                    <View
                      style={[
                        styles.taskPriorityPill,
                        {
                          backgroundColor:
                            task.priority === 'urgent'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : task.priority === 'high'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.taskPriorityText,
                          {
                            color:
                              task.priority === 'urgent'
                                ? '#EF4444'
                                : task.priority === 'high'
                                ? '#F59E0B'
                                : '#3B82F6',
                          },
                        ]}
                      >
                        {task.priority.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>

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

        {/* Voice Transcript Card with Original Preservation Toggle */}
        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={15} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Voice Transcript</Text>
            </View>

            <TouchableOpacity onPress={openEditModal} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="create-outline" size={14} color={colors.primaryLight} />
              <Text style={{ fontSize: typography.sizes.xs, color: colors.primaryLight, fontWeight: typography.weights.bold }}>
                Edit Text
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

        {/* Tags / Keywords with Edit shortcut */}
        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="pricetags-outline" size={15} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tags & Keywords</Text>
            </View>
            <TouchableOpacity onPress={openEditModal}>
              <Text style={{ fontSize: typography.sizes.xs, color: colors.primaryLight, fontWeight: typography.weights.bold }}>
                + Edit Tags
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagsContainer}>
            {memory.tags && memory.tags.length > 0 ? (
              memory.tags.map((t, idx) => (
                <View
                  key={idx}
                  style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{t}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.sectionEmptyText, { color: colors.textMuted }]}>
                No tags assigned. Tap "+ Edit Tags" to add custom tags.
              </Text>
            )}
          </View>
        </Card>

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

      {/* 1. EDIT MEMORY MODAL (Title, Summary, Transcript, Category, Tags) */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheet, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                Edit Memory Details
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: spacing.md }} showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Memory Title"
                placeholderTextColor={colors.textMuted}
                style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              />

              {/* Category Selector */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 4 }}>
                {EDITABLE_CATEGORIES.map((cat) => (
                  <CategoryPill
                    key={cat}
                    category={cat}
                    isSelected={editCategory === cat}
                    onPress={() => setEditCategory(cat)}
                    size="sm"
                  />
                ))}
              </ScrollView>

              {/* Summary Input */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Summary</Text>
              <TextInput
                value={editSummary}
                onChangeText={setEditSummary}
                placeholder="AI / User summary"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              />

              {/* Transcript Input */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                Transcript (User Edited)
              </Text>
              <TextInput
                value={editTranscript}
                onChangeText={setEditTranscript}
                placeholder="Voice transcript text"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              />

              {/* Tags Management */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Tags</Text>
              <View style={styles.editTagsContainer}>
                {editTags.map((tag, idx) => (
                  <View
                    key={idx}
                    style={[styles.editTagChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.editTagChipText, { color: colors.primaryLight }]}>#{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={{ marginLeft: 5 }}>
                      <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Add New Tag Input Row */}
              <View style={[styles.addTagInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  value={newTagInput}
                  onChangeText={setNewTagInput}
                  placeholder="Add a new tag..."
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handleAddTag}
                  style={[styles.addTagTextInput, { color: colors.textPrimary }]}
                />
                <TouchableOpacity onPress={handleAddTag} style={[styles.addTagBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.addTagBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Save Button */}
              <Button
                title={savingEdit ? 'Saving Changes...' : 'Save Memory Changes'}
                onPress={handleSaveEdit}
                loading={savingEdit}
                style={{ marginTop: 24, marginBottom: 20 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. VOICE REMINDER PRESET MODAL */}
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
  headerActionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: 8,
  },
  archivedBannerText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.medium,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: 28,
    marginBottom: 4,
  },
  date: {
    fontSize: typography.sizes.xs,
  },
  audioPlayer: {
    marginBottom: spacing.md,
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
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  summaryText: {
    fontSize: typography.sizes.xs,
    lineHeight: 22,
  },
  addTaskHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTaskHeaderText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  quickTaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  quickTaskTextInput: {
    flex: 1,
    fontSize: typography.sizes.xs,
    paddingVertical: 6,
  },
  quickTaskSubmitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  quickTaskSubmitBtnText: {
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  emptyTasksNote: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  tasksListWrap: {
    gap: 8,
  },
  relatedTaskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    gap: 8,
  },
  taskCheckboxTouch: {
    padding: 2,
  },
  relatedTaskTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  taskCompletedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  relatedTaskDate: {
    fontSize: 10,
    marginTop: 2,
  },
  taskPriorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  taskPriorityText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
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
    marginTop: 6,
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
  sectionEmptyText: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  editSheet: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
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
  inputLabel: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: typography.sizes.xs,
  },
  modalTextArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  editTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  editTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  editTagChipText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.semibold,
  },
  addTagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  addTagTextInput: {
    flex: 1,
    fontSize: typography.sizes.xs,
    paddingVertical: 6,
  },
  addTagBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  addTagBtnText: {
    fontSize: typography.sizes.xxs,
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
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
