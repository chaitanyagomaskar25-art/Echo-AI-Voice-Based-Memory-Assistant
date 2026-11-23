import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  fetchTasks,
  createTask,
  updateTask,
  toggleTaskComplete,
  rescheduleTask,
  confirmAmbiguousDate,
  deleteTask,
  setActiveSection,
} from '../store/slices/taskSlice';
import {
  scheduleNewReminder,
  snoozeReminder,
  cancelAndRemoveReminder,
} from '../store/slices/reminderSlice';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { formatRelativeTime } from '../utils/dateFormatter';
import { getCategoryIcon } from '../utils/helpers';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SECTIONS = [
  { id: 'upcoming', label: 'Upcoming', icon: 'time-outline' },
  { id: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
  { id: 'pending', label: 'Pending', icon: 'hourglass-outline' },
  { id: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
];

const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const CATEGORIES = ['Work', 'Study', 'Personal', 'Ideas', 'Tasks'];

export const TasksScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();

  const { tasks, sections, activeSection, loading } = useSelector((state) => state.tasks);

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [ambiguousModalVisible, setAmbiguousModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  // Active task for editing / rescheduling
  const [selectedTask, setSelectedTask] = useState(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskCategory, setTaskCategory] = useState('Tasks');

  const loadData = useCallback(() => {
    dispatch(fetchTasks({ section: activeSection }));
  }, [dispatch, activeSection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleComplete = (id) => {
    dispatch(toggleTaskComplete(id));
  };

  const handleDeleteTask = (id, title) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteTask(id)),
        },
      ]
    );
  };

  // Open Edit Modal
  const openEditModal = (task) => {
    setSelectedTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskPriority(task.priority || 'medium');
    setTaskCategory(task.category || 'Tasks');
    setEditModalVisible(true);
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!taskTitle.trim() || !selectedTask) return;
    dispatch(
      updateTask({
        id: selectedTask._id,
        data: {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          priority: taskPriority,
          category: taskCategory,
        },
      })
    );
    setEditModalVisible(false);
    setSelectedTask(null);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('medium');
    setTaskCategory('Tasks');
    setCreateModalVisible(true);
  };

  // Save New Task
  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;
    dispatch(
      createTask({
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        priority: taskPriority,
        category: taskCategory,
      })
    );
    setCreateModalVisible(false);
  };

  // Open Reschedule Modal
  const openRescheduleModal = (task) => {
    setSelectedTask(task);
    setRescheduleModalVisible(true);
  };

  // Open Reminder Modal
  const openReminderModal = (task) => {
    setSelectedTask(task);
    setReminderModalVisible(true);
  };

  // Apply Reminder Preset
  const handleApplyReminder = (presetType) => {
    if (!selectedTask) return;
    const now = new Date();
    let remindTime = null;

    if (presetType === '15m_before') {
      if (selectedTask.dueDate) {
        remindTime = new Date(new Date(selectedTask.dueDate).getTime() - 15 * 60 * 1000);
      }
      if (!remindTime || remindTime <= now) {
        remindTime = new Date(now.getTime() + 15 * 60 * 1000);
      }
    } else if (presetType === '1h_before') {
      if (selectedTask.dueDate) {
        remindTime = new Date(new Date(selectedTask.dueDate).getTime() - 60 * 60 * 1000);
      }
      if (!remindTime || remindTime <= now) {
        remindTime = new Date(now.getTime() + 60 * 60 * 1000);
      }
    } else if (presetType === 'tomorrow_9am') {
      remindTime = new Date(now);
      remindTime.setDate(remindTime.getDate() + 1);
      remindTime.setHours(9, 0, 0, 0);
    } else if (presetType === 'today_5pm') {
      remindTime = new Date(now);
      remindTime.setHours(17, 0, 0, 0);
      if (remindTime <= now) {
        remindTime.setDate(remindTime.getDate() + 1);
      }
    } else if (presetType === 'snooze_15m') {
      dispatch(
        snoozeReminder({
          id: selectedTask._id,
          minutes: 15,
          title: selectedTask.title,
        })
      );
      Alert.alert('Reminder Snoozed', 'Notification snoozed for 15 minutes.');
      setReminderModalVisible(false);
      setSelectedTask(null);
      return;
    } else if (presetType === 'remove') {
      dispatch(cancelAndRemoveReminder({ id: selectedTask._id }));
      Alert.alert('Reminder Cancelled', 'Scheduled notification removed.');
      setReminderModalVisible(false);
      setSelectedTask(null);
      return;
    }

    if (remindTime) {
      dispatch(
        scheduleNewReminder({
          title: selectedTask.title,
          note: selectedTask.description || 'Echo task reminder',
          remindAt: remindTime.toISOString(),
          taskId: selectedTask._id,
          sourceType: 'task',
        })
      );
      Alert.alert(
        'Reminder Scheduled',
        `Expo notification set for ${remindTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${remindTime.toLocaleDateString()}`
      );
    }

    setReminderModalVisible(false);
    setSelectedTask(null);
  };

  // Apply Reschedule Preset
  const handleApplyReschedule = (presetDays) => {
    if (!selectedTask) return;
    let targetDate = null;
    if (presetDays !== null) {
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + presetDays);
      targetDate.setHours(17, 0, 0, 0);
    }

    dispatch(
      rescheduleTask({
        id: selectedTask._id,
        dueDate: targetDate ? targetDate.toISOString() : null,
      })
    );
    setRescheduleModalVisible(false);
    setSelectedTask(null);
  };

  // Confirm Ambiguous Date
  const handleConfirmAmbiguous = (task, keepWithout) => {
    if (keepWithout) {
      dispatch(confirmAmbiguousDate({ id: task._id, keepWithoutDeadline: true }));
    } else {
      // Pick next week Monday by default for "sometime next week"
      const nextMon = new Date();
      nextMon.setDate(nextMon.getDate() + ((1 + 7 - nextMon.getDay()) % 7 || 7));
      nextMon.setHours(14, 0, 0, 0);
      dispatch(confirmAmbiguousDate({ id: task._id, confirmedDate: nextMon.toISOString() }));
    }
    setAmbiguousModalVisible(false);
    setSelectedTask(null);
  };

  // Find any task with ambiguous date for the banner
  const ambiguousTask = tasks.find((t) => t.hasAmbiguousDate && !t.dateConfirmed);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#6366F1';
      case 'low':
        return '#10B981';
      default:
        return colors.textMuted;
    }
  };

  const renderTaskItem = ({ item }) => {
    const isOverdue = !item.isCompleted && item.dueDate && new Date(item.dueDate) < new Date();
    const priorityColor = getPriorityColor(item.priority);
    const categoryColor = colors.categories[item.category] || colors.primary;

    return (
      <View
        style={[
          styles.taskCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: isOverdue ? 'rgba(239, 68, 68, 0.4)' : colors.border,
          },
          isOverdue && { borderLeftWidth: 3.5, borderLeftColor: '#EF4444' },
          item.isCompleted && { opacity: 0.65 },
        ]}
      >
        <View style={styles.taskCardMain}>
          {/* Checkbox toggle */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleToggleComplete(item._id)}
            style={[
              styles.checkbox,
              { borderColor: item.isCompleted ? colors.primary : colors.textMuted },
              item.isCompleted && { backgroundColor: colors.primary },
            ]}
          >
            {item.isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </TouchableOpacity>

          {/* Task Info */}
          <View style={styles.taskBody}>
            {/* Header: Priority, Category, Due Date */}
            <View style={styles.taskHeaderRow}>
              <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}18` }]}>
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {item.priority.toUpperCase()}
                </Text>
              </View>

              <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}>
                <Ionicons
                  name={getCategoryIcon(item.category)}
                  size={10}
                  color={categoryColor}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {item.category}
                </Text>
              </View>

              {item.dueDate ? (
                <View style={[styles.dateBadge, isOverdue && styles.dateBadgeOverdue]}>
                  <Ionicons
                    name="calendar-outline"
                    size={11}
                    color={isOverdue ? '#EF4444' : colors.textSecondary}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.dateBadgeText, { color: isOverdue ? '#EF4444' : colors.textSecondary }]}>
                    {isOverdue ? 'Overdue: ' : 'Due: '}
                    {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ) : (
                <View style={styles.dateBadge}>
                  <Text style={[styles.dateBadgeText, { color: colors.textMuted }]}>
                    No Deadline
                  </Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text
              style={[
                styles.taskTitle,
                { color: colors.textPrimary },
                item.isCompleted && styles.completedTitle,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* Description context */}
            {item.description ? (
              <Text style={[styles.taskDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {/* Ambiguous date badge if present */}
            {item.hasAmbiguousDate && !item.dateConfirmed && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setSelectedTask(item);
                  setAmbiguousModalVisible(true);
                }}
                style={styles.ambiguousPill}
              >
                <Ionicons name="help-circle" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.ambiguousText}>
                  Ambiguous date ('{item.dueDateText}') • Tap to confirm
                </Text>
              </TouchableOpacity>
            )}

            {/* Linked Memory Link */}
            {item.memory && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MemoryDetail', { memoryId: item.memory._id || item.memory })}
                style={[styles.linkedMemoryChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="link-outline" size={12} color={colors.primaryLight} style={{ marginRight: 4 }} />
                <Text style={[styles.linkedMemoryText, { color: colors.textSecondary }]} numberOfLines={1}>
                  Linked memory: <Text style={{ color: colors.primaryLight, fontWeight: typography.weights.semibold }}>{item.memory.title}</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Task Actions Footer: Reschedule, Edit, Delete */}
        <View style={[styles.taskFooterRow, { borderTopColor: colors.borderLight }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openRescheduleModal(item)}
              style={styles.footerActionBtn}
            >
              <Ionicons name="calendar" size={12} color={colors.primaryLight} style={{ marginRight: 4 }} />
              <Text style={[styles.footerActionText, { color: colors.primaryLight }]}>
                {item.dueDate ? 'Reschedule' : 'Set Deadline'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openReminderModal(item)}
              style={[styles.footerActionBtn, { marginLeft: 12 }]}
            >
              <Ionicons
                name={item.remindAt ? 'notifications' : 'notifications-outline'}
                size={12}
                color={item.remindAt ? colors.amber : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.footerActionText, { color: item.remindAt ? colors.amber : colors.textSecondary }]}>
                {item.remindAt ? 'Reminder Set' : 'Remind Me'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openEditModal(item)}
              style={styles.footerIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDeleteTask(item._id, item.title)}
              style={[styles.footerIconBtn, { marginLeft: 12 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color={colors.rose || '#EF4444'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Ambiguous Date Confirmation Notice Banner */}
      {ambiguousTask && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setSelectedTask(ambiguousTask);
            setAmbiguousModalVisible(true);
          }}
          style={styles.alertBanner}
        >
          <Ionicons name="alert-circle" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertBannerTitle}>Ambiguous Date Detected</Text>
            <Text style={styles.alertBannerText} numberOfLines={1}>
              Voice memo mentions "{ambiguousTask.dueDateText}". Confirm exact date before scheduling reminders.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
        </TouchableOpacity>
      )}

      {/* Section Tabs Header */}
      <View style={[styles.tabBarWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {SECTIONS.map((sec) => {
            const isSelected = activeSection === sec.id;
            const count = sections[sec.id] || 0;
            const isOverdueTab = sec.id === 'overdue' && count > 0;

            return (
              <TouchableOpacity
                key={sec.id}
                activeOpacity={0.75}
                onPress={() => dispatch(setActiveSection(sec.id))}
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  isSelected && {
                    backgroundColor: isOverdueTab ? 'rgba(239, 68, 68, 0.2)' : `${colors.primary}25`,
                    borderColor: isOverdueTab ? '#EF4444' : colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name={sec.icon}
                  size={14}
                  color={isSelected ? (isOverdueTab ? '#EF4444' : colors.primaryLight) : colors.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: colors.textSecondary },
                    isSelected && {
                      color: isOverdueTab ? '#EF4444' : colors.primaryLight,
                      fontWeight: typography.weights.bold,
                    },
                  ]}
                >
                  {sec.label}
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isOverdueTab ? '#EF4444' : `${colors.primary}35` },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isOverdueTab ? '#FFFFFF' : colors.primaryLight },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Task List */}
      {loading && tasks.length === 0 ? (
        <LoadingSpinner message="Loading actionable tasks..." fullScreen />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item._id}
          renderItem={renderTaskItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadData}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="checkbox-outline"
              title={`No ${activeSection} tasks`}
              description={`You have no tasks in the ${activeSection} category. Record a voice memo or create a task manually.`}
              actionTitle="Add New Task"
              onAction={openCreateModal}
            />
          }
        />
      )}

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openCreateModal}
        style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 70 }]}
      >
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* 1. RESCHEDULE MODAL */}
      <Modal
        visible={rescheduleModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={20} color={colors.primaryLight} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                Reschedule Task
              </Text>
            </View>

            <Text style={[styles.modalSubtitleText, { color: colors.textSecondary }]}>
              "{selectedTask?.title}"
            </Text>

            <View style={styles.presetGrid}>
              <TouchableOpacity
                onPress={() => handleApplyReschedule(0)}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Today (5 PM)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReschedule(1)}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReschedule(3)}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>In 3 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReschedule(7)}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Next Week</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReschedule(null)}
                style={[styles.presetBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              >
                <Text style={[styles.presetBtnText, { color: '#EF4444' }]}>Remove Deadline</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setRescheduleModalVisible(false)}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 1.5 TASK NOTIFICATION REMINDER MODAL */}
      <Modal
        visible={reminderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="notifications" size={20} color={colors.amber} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                Task Reminder
              </Text>
            </View>

            <Text style={[styles.modalSubtitleText, { color: colors.textSecondary }]}>
              Schedule local push notification for "{selectedTask?.title}":
            </Text>

            <View style={styles.presetGrid}>
              <TouchableOpacity
                onPress={() => handleApplyReminder('15m_before')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="alarm-outline" size={16} color={colors.primaryLight} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>15m Before Due</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReminder('1h_before')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="time-outline" size={16} color={colors.primaryLight} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>1 Hour Before</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReminder('today_5pm')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="sunny-outline" size={16} color={colors.amber} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Today at 5:00 PM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReminder('tomorrow_9am')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primaryLight} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Tomorrow at 9 AM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReminder('snooze_15m')}
                style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="timer-outline" size={16} color={colors.primaryLight} style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Snooze 15 Min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyReminder('remove')}
                style={[styles.presetBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              >
                <Ionicons name="notifications-off-outline" size={16} color="#EF4444" style={{ marginBottom: 4 }} />
                <Text style={[styles.presetBtnText, { color: '#EF4444' }]}>Remove Reminder</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setReminderModalVisible(false)}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. CONFIRM AMBIGUOUS DATE MODAL */}
      <Modal
        visible={ambiguousModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAmbiguousModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="help-circle" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                Confirm Ambiguous Date
              </Text>
            </View>

            <Text style={[styles.modalSubtitleText, { color: colors.textSecondary }]}>
              The voice memo said: "{selectedTask?.dueDateText}". Echo never invents deadlines—please confirm before scheduling reminders:
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleConfirmAmbiguous(selectedTask, false)}
              style={[styles.confirmOptionBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.confirmOptionBtnText}>Schedule for Next Monday (2:00 PM)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleConfirmAmbiguous(selectedTask, true)}
              style={[styles.confirmOptionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={[styles.confirmOptionBtnText, { color: colors.textPrimary }]}>
                Keep in Pending (No Deadline)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAmbiguousModalVisible(false)}
              style={[styles.cancelBtn, { borderColor: colors.border, marginTop: 8 }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. CREATE / EDIT TASK MODAL */}
      <Modal
        visible={createModalVisible || editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setCreateModalVisible(false);
          setEditModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingBottom: 12 }]}>
              <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                {editModalVisible ? 'Edit Task' : 'Create New Task'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCreateModalVisible(false);
                  setEditModalVisible(false);
                }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: spacing.md }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Task Title</Text>
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="e.g. Finalize sprint roadmap..."
                placeholderTextColor={colors.textMuted}
                style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Description / Context</Text>
              <TextInput
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="Optional task details..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              />

              {/* Priority Selector */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Priority</Text>
              <View style={styles.chipRow}>
                {PRIORITIES.map((p) => {
                  const isSelected = taskPriority === p;
                  const pColor = getPriorityColor(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      activeOpacity={0.75}
                      onPress={() => setTaskPriority(p)}
                      style={[
                        styles.selectorChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSelected && { backgroundColor: `${pColor}20`, borderColor: pColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectorChipText,
                          { color: isSelected ? pColor : colors.textSecondary },
                          isSelected && { fontWeight: typography.weights.bold },
                        ]}
                      >
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Category Selector */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = taskCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      activeOpacity={0.75}
                      onPress={() => setTaskCategory(cat)}
                      style={[
                        styles.selectorChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSelected && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectorChipText,
                          { color: isSelected ? colors.primaryLight : colors.textSecondary },
                          isSelected && { fontWeight: typography.weights.bold },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={editModalVisible ? handleSaveEdit : handleCreateTask}
                style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
              >
                <Text style={styles.saveBtnText}>
                  {editModalVisible ? 'Save Changes' : 'Create Task'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  alertBannerTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#F59E0B',
  },
  alertBannerText: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 1,
  },
  tabBarWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  tabsScroll: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  listContent: {
    padding: spacing.md,
  },
  taskCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm + 2,
    overflow: 'hidden',
  },
  taskCardMain: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
    marginTop: 2,
  },
  taskBody: {
    flex: 1,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  dateBadgeOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
  taskTitle: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.bold,
    lineHeight: 20,
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  ambiguousPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
  },
  ambiguousText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: typography.weights.medium,
  },
  linkedMemoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  linkedMemoryText: {
    fontSize: 10,
  },
  taskFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerActionText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  footerIconBtn: {
    padding: 3,
  },
  fab: {
    position: 'absolute',
    right: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitleText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  modalSubtitleText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  presetGrid: {
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  confirmOptionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmOptionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  cancelBtn: {
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  sheetContent: {
    maxHeight: '85%',
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
  modalInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: typography.sizes.sm,
  },
  modalTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectorChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  selectorChipText: {
    fontSize: 11,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});

export default TasksScreen;
