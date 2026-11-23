import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchConversations,
  loadConversationThread,
  createNewConversation,
  sendMessageInConversation,
  deleteConversation,
  clearAllConversations,
  resetActiveConversation,
  addUserOptimisticMessage,
} from '../store/slices/conversationSlice';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { formatRelativeTime } from '../utils/dateFormatter';

const NATURAL_SEARCH_EXAMPLES = [
  'What did I work on yesterday?',
  'Summarize my learning progress this week.',
  'What ideas have I saved about startups?',
  'Which tasks are still pending?',
];

const CATEGORIES = ['All', 'Ideas', 'Work', 'Study', 'Personal', 'Tasks'];
const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'week', label: 'Past Week' },
  { id: 'month', label: 'Past Month' },
];

export const AskEchoScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();

  const {
    conversations,
    activeConversation,
    activeConversationId,
    loading,
    sending,
  } = useSelector((state) => state.conversations);

  const [inputQuery, setInputQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [expandedTranscripts, setExpandedTranscripts] = useState({});
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const flatListRef = useRef(null);

  // Fetch all conversations on mount
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  const toggleTranscriptExpand = (id) => {
    setExpandedTranscripts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSend = (queryToSend) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || sending) return;

    // Optimistically show user question
    dispatch(addUserOptimisticMessage({ text }));
    setInputQuery('');

    dispatch(
      sendMessageInConversation({
        conversationId: activeConversationId,
        text,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        dateFilter: selectedDateFilter !== 'all' ? selectedDateFilter : undefined,
      })
    );
  };

  const handleStartNewChat = () => {
    dispatch(resetActiveConversation());
    setHistoryModalVisible(false);
  };

  const handleSelectConversation = (id) => {
    dispatch(loadConversationThread(id));
    setHistoryModalVisible(false);
  };

  const handleDeleteConversation = (id, title) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title || 'this conversation'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteConversation(id));
          },
        },
      ]
    );
  };

  const handleClearAllHistory = () => {
    Alert.alert(
      'Clear All Conversations',
      'This will permanently delete all your conversation history with Echo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            dispatch(clearAllConversations());
            setHistoryModalVisible(false);
          },
        },
      ]
    );
  };

  const messages = activeConversation?.messages || [
    {
      _id: 'welcome',
      sender: 'echo',
      text: "Hello! I'm Echo, your conversational memory assistant. Ask me questions about your saved notes, whereabouts, work, or ideas.",
      timestamp: new Date().toISOString(),
      citedMemories: [],
    },
  ];

  const renderChatItem = ({ item }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.echoRow]}>
        {!isUser && (
          <View style={styles.echoAvatar}>
            <LinearGradient
              colors={colors.gradientPrimary}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser
              ? styles.userBubble
              : [styles.echoBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
        >
          {isUser && (
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: radius.card }]}
            />
          )}

          <Text
            style={[
              styles.messageText,
              { color: isUser ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            {item.text}
          </Text>

          {/* Grounded Cited Supporting Memories */}
          {!isUser && item.citedMemories && item.citedMemories.length > 0 && (
            <View style={[styles.citationsContainer, { borderTopColor: colors.borderLight }]}>
              <View style={styles.citationsHeaderRow}>
                <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                <Text style={[styles.citationsTitle, { color: colors.textSecondary }]}>
                  Grounded in {item.citedMemories.length} Saved {item.citedMemories.length === 1 ? 'Memory' : 'Memories'}
                </Text>
              </View>

              {item.citedMemories.map((source, idx) => {
                const isExpanded = !!expandedTranscripts[source._id || source.id || idx];
                const categoryColor = colors.categories[source.category] || colors.primary;
                const formattedDate = new Date(source.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <View
                    key={source._id || source.id || idx}
                    style={[
                      styles.sourceCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderLeftColor: categoryColor,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* Top Row: Category, Relevance % match, Date */}
                    <View style={styles.sourceHeader}>
                      <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}18` }]}>
                        <Text style={[styles.sourceCategory, { color: categoryColor }]}>
                          {source.category}
                        </Text>
                      </View>

                      {typeof source.relevanceScore === 'number' && source.relevanceScore > 0 && (
                        <View style={styles.relevanceBadge}>
                          <Ionicons name="sparkles" size={10} color="#A78BFA" style={{ marginRight: 3 }} />
                          <Text style={styles.relevanceText}>{source.relevanceScore}% Match</Text>
                        </View>
                      )}

                      <Text style={[styles.sourceDate, { color: colors.textMuted }]}>
                        📅 {formattedDate}
                      </Text>
                    </View>

                    {/* Memory Title */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('MemoryDetail', { memoryId: source.memoryId || source.id || source._id })}
                    >
                      <Text style={[styles.sourceTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {source.title}
                      </Text>
                    </TouchableOpacity>

                    {/* Clean AI Summary */}
                    <Text style={[styles.sourceSnippet, { color: colors.textSecondary }]}>
                      {source.summary}
                    </Text>

                    {/* Expandable Pristine Voice Transcript */}
                    {source.originalTranscript ? (
                      <View style={styles.transcriptSection}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => toggleTranscriptExpand(source._id || source.id || idx)}
                          style={styles.transcriptToggleBtn}
                        >
                          <Ionicons
                            name={isExpanded ? 'chevron-up-circle-outline' : 'mic-outline'}
                            size={12}
                            color={colors.primaryLight}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.transcriptToggleText, { color: colors.primaryLight }]}>
                            {isExpanded ? 'Hide Voice Words' : 'View Original Voice Words'}
                          </Text>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View
                            style={[
                              styles.transcriptBox,
                              { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.transcriptLabel, { color: colors.textMuted }]}>
                              Original Voice Recording:
                            </Text>
                            <Text style={[styles.transcriptText, { color: colors.textPrimary }]}>
                              "{source.originalTranscript}"
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : null}

                    {/* Open full memory details */}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => navigation.navigate('MemoryDetail', { memoryId: source.memoryId || source.id || source._id })}
                      style={styles.viewDetailRow}
                    >
                      <Text style={[styles.viewDetailText, { color: colors.primaryLight }]}>
                        Open Memory
                      </Text>
                      <Ionicons name="arrow-forward" size={11} color={colors.primaryLight} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.timeText, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
            {formatRelativeTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Header Row with Conversation History and Actions */}
      <View style={[styles.topControlRow, { borderBottomColor: colors.border }]}>
        {/* Conversations History Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setHistoryModalVisible(true)}
          style={[styles.historyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="chatbubbles-outline" size={15} color={colors.primaryLight} style={{ marginRight: 5 }} />
          <Text style={[styles.historyButtonText, { color: colors.textPrimary }]}>
            History ({conversations.length})
          </Text>
        </TouchableOpacity>

        {/* Current Conversation Title */}
        <View style={styles.titleWrapper}>
          <Text style={[styles.activeChatTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {activeConversation?.title || 'New Conversation'}
          </Text>
        </View>

        {/* Action Buttons: New Chat & Delete */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleStartNewChat}
            style={[styles.iconActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={18} color={colors.primaryLight} />
          </TouchableOpacity>

          {activeConversationId && (
            <TouchableOpacity
              onPress={() => handleDeleteConversation(activeConversationId, activeConversation?.title)}
              style={[styles.iconActionBtn, { backgroundColor: colors.surface, borderColor: colors.border, marginLeft: 6 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color={colors.rose || '#EF4444'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Row: Category & Date */}
      <View style={[styles.filterBarWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.75}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  isSelected && { backgroundColor: `${colors.primary}22`, borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
                    isSelected && { color: colors.primaryLight, fontWeight: typography.weights.bold },
                  ]}
                >
                  {cat === 'All' ? 'All Categories' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />

          {DATE_FILTERS.map((df) => {
            const isSelected = selectedDateFilter === df.id;
            return (
              <TouchableOpacity
                key={df.id}
                activeOpacity={0.75}
                onPress={() => setSelectedDateFilter(df.id)}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  isSelected && { backgroundColor: 'rgba(167, 139, 250, 0.2)', borderColor: '#A78BFA' },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
                    isSelected && { color: '#A78BFA', fontWeight: typography.weights.bold },
                  ]}
                >
                  {df.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Chat Messages Stream */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item._id || String(index)}
        renderItem={renderChatItem}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Natural Memory Question Suggestions */}
      <View style={[styles.quickPromptsWrapper, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.promptHeaderRow}>
          <Ionicons name="sparkles" size={12} color="#A78BFA" style={{ marginRight: 4 }} />
          <Text style={[styles.promptHeaderTitle, { color: colors.textMuted }]}>
            Ask Echo about your memories:
          </Text>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={NATURAL_SEARCH_EXAMPLES}
          keyExtractor={(item, i) => i.toString()}
          contentContainerStyle={styles.quickPromptsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleSend(item)}
              style={[styles.quickPromptChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            >
              <Text style={[styles.quickPromptText, { color: colors.textSecondary }]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 74,
          },
        ]}
      >
        <TextInput
          value={inputQuery}
          onChangeText={setInputQuery}
          placeholder="Ask Echo about any memory..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.textInput,
            { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
          ]}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleSend()}
          disabled={!inputQuery.trim() || sending}
          style={styles.sendButtonWrapper}
        >
          <LinearGradient
            colors={!inputQuery.trim() || sending ? [colors.border, colors.border] : colors.gradientPrimary}
            style={styles.sendGradient}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Conversations History Sheet / Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="chatbubbles" size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Conversation History
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Conversation List */}
            <FlatList
              data={conversations}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: spacing.md }}
              ListEmptyComponent={
                <View style={styles.emptyConversationsBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.textMuted} />
                  <Text style={[styles.emptyConversationsText, { color: colors.textSecondary }]}>
                    No conversations yet
                  </Text>
                  <Text style={[styles.emptyConversationsSub, { color: colors.textMuted }]}>
                    Ask Echo a question to start your first memory session.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isActive = item._id === activeConversationId;
                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleSelectConversation(item._id)}
                    style={[
                      styles.conversationItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isActive ? colors.primaryLight : colors.border,
                      },
                      isActive && { borderWidth: 1.5 },
                    ]}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text
                          style={[
                            styles.conversationItemTitle,
                            { color: isActive ? colors.primaryLight : colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <View style={[styles.msgCountPill, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                          <Text style={styles.msgCountText}>{item.messageCount} msgs</Text>
                        </View>
                      </View>
                      <Text style={[styles.conversationSnippet, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.lastMessageSnippet}
                      </Text>
                      <Text style={[styles.conversationTime, { color: colors.textMuted }]}>
                        {formatRelativeTime(item.lastMessageAt || item.updatedAt)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(item._id, item.title);
                      }}
                      style={styles.deleteConversationBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.rose || '#EF4444'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Modal Bottom Actions */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={handleStartNewChat}
                style={[styles.modalNewChatBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalNewChatText}>New Conversation</Text>
              </TouchableOpacity>

              {conversations.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearAllHistory}
                  style={styles.modalClearAllBtn}
                >
                  <Text style={[styles.modalClearAllText, { color: colors.rose || '#EF4444' }]}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  historyButtonText: {
    fontSize: typography.sizes.xxs + 1,
    fontWeight: typography.weights.semibold,
  },
  titleWrapper: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  activeChatTitle: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBarWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
  },
  filterDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 4,
  },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  echoRow: {
    justifyContent: 'flex-start',
  },
  echoAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: 4,
    overflow: 'hidden',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: radius.card,
    padding: spacing.md,
    overflow: 'hidden',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  echoBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  citationsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  citationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    gap: 5,
  },
  citationsTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceCard: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs + 2,
    borderLeftWidth: 3,
    borderWidth: 1,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: radius.xs,
    marginRight: 6,
  },
  sourceCategory: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  relevanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    marginRight: 6,
  },
  relevanceText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#A78BFA',
  },
  sourceDate: {
    fontSize: 10,
    marginLeft: 'auto',
  },
  sourceTitle: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  sourceSnippet: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  transcriptSection: {
    marginTop: 4,
    marginBottom: 4,
  },
  transcriptToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  transcriptToggleText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
  },
  transcriptBox: {
    marginTop: 4,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  transcriptLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  transcriptText: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 3,
  },
  viewDetailText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
  },
  timeText: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  quickPromptsWrapper: {
    borderTopWidth: 1,
    paddingTop: 6,
  },
  promptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  promptHeaderTitle: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
  },
  quickPromptsContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 6,
    gap: 8,
  },
  quickPromptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  quickPromptText: {
    fontSize: typography.sizes.xxs + 1,
    fontWeight: typography.weights.medium,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  sendButtonWrapper: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  emptyConversationsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyConversationsText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.sm,
  },
  emptyConversationsSub: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.xl,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  conversationItemTitle: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  msgCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    marginLeft: 6,
  },
  msgCountText: {
    fontSize: 9,
    fontWeight: typography.weights.semibold,
    color: '#818CF8',
  },
  conversationSnippet: {
    fontSize: 11,
    marginTop: 2,
  },
  conversationTime: {
    fontSize: 10,
    marginTop: 3,
  },
  deleteConversationBtn: {
    padding: 6,
    marginLeft: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  modalNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  modalNewChatText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
  },
  modalClearAllBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  modalClearAllText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});

export default AskEchoScreen;
