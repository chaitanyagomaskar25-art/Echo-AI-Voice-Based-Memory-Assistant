import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';
import EntityChips from './EntityChips';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';
import { formatRelativeTime } from '../../utils/dateFormatter';
import { getCategoryIcon } from '../../utils/helpers';

export const MemoryCard = ({
  memory,
  onPress,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
  style,
}) => {
  const { colors, isDark } = useTheme();

  if (!memory) return null;

  const categoryColor = colors.categories[memory.category] || colors.primary;
  const pendingReminders = (memory.reminders || []).filter((r) => !r.isCompleted);

  return (
    <Card
      onPress={onPress}
      style={[
        styles.card,
        memory.isPinned && {
          borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.3)',
          borderLeftWidth: 3.5,
          borderLeftColor: colors.amber,
        },
        memory.isFavorite && !memory.isPinned && {
          borderColor: isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(202, 138, 4, 0.25)',
          borderLeftWidth: 3.5,
          borderLeftColor: '#EAB308',
        },
        memory.isArchived && {
          opacity: 0.75,
        },
        style,
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}18` }]}>
            <Ionicons
              name={getCategoryIcon(memory.category)}
              size={12}
              color={categoryColor}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {memory.category}
            </Text>
          </View>
          {memory.audioUrl && (
            <View style={[styles.audioBadge, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="volume-medium" size={11} color={colors.primaryLight} style={{ marginRight: 3 }} />
              <Text style={[styles.audioBadgeText, { color: colors.primaryLight }]}>
                {memory.audioDuration ? `${Math.round(memory.audioDuration)}s` : 'Audio'}
              </Text>
            </View>
          )}
          {typeof memory.relevanceScore === 'number' && (
            <View style={styles.relevanceBadge}>
              <Ionicons name="sparkles" size={10} color="#A78BFA" style={{ marginRight: 3 }} />
              <Text style={styles.relevanceText}>{memory.relevanceScore}% Match</Text>
            </View>
          )}
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {formatRelativeTime(memory.createdAt)}
          </Text>
        </View>

        {/* Action icons: Favorite, Pin, Archive, Delete */}
        <View style={styles.actionRow}>
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite(memory._id);
              }}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons
                name={memory.isFavorite ? 'star' : 'star-outline'}
                size={15}
                color={memory.isFavorite ? '#EAB308' : colors.textMuted}
              />
            </TouchableOpacity>
          )}

          {onTogglePin && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onTogglePin(memory._id);
              }}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons
                name={memory.isPinned ? 'pin' : 'pin-outline'}
                size={15}
                color={memory.isPinned ? colors.amber : colors.textMuted}
              />
            </TouchableOpacity>
          )}

          {onToggleArchive && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onToggleArchive(memory._id);
              }}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons
                name={memory.isArchived ? 'archive' : 'archive-outline'}
                size={15}
                color={memory.isArchived ? colors.primaryLight : colors.textMuted}
              />
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onDelete(memory._id);
              }}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Memory Title */}
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {memory.title}
      </Text>

      {/* Memory Transcript / Summary Snippet */}
      <Text style={[styles.snippet, { color: colors.textSecondary }]} numberOfLines={2}>
        {memory.summary || memory.transcript}
      </Text>

      {/* Detected Entities */}
      {memory.entities && memory.entities.length > 0 && (
        <EntityChips entities={memory.entities} maxDisplay={3} style={styles.entities} />
      )}

      {/* Footer: Reminders & Tags */}
      <View style={[styles.footerRow, { borderTopColor: colors.borderLight }]}>
        {pendingReminders.length > 0 ? (
          <View style={[styles.reminderPill, { backgroundColor: `${colors.amber}15` }]}>
            <Ionicons name="alarm-outline" size={12} color={colors.amber} style={{ marginRight: 4 }} />
            <Text style={[styles.reminderText, { color: colors.amber }]}>
              {pendingReminders.length} reminder{pendingReminders.length > 1 ? 's' : ''}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {memory.tags && memory.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {memory.tags.slice(0, 2).map((t, i) => (
              <Text key={i} style={[styles.tagText, { color: colors.textMuted }]}>
                #{t}
              </Text>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.xs,
    marginRight: spacing.sm,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.xs,
    marginRight: spacing.sm,
  },
  audioBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  dateText: {
    fontSize: typography.sizes.xs,
  },
  relevanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    marginRight: spacing.sm,
  },
  relevanceText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#A78BFA',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: spacing.sm,
    padding: 3,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
    lineHeight: 21,
    letterSpacing: typography.letterSpacing.tight,
  },
  snippet: {
    fontSize: typography.sizes.sm,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  entities: {
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  reminderText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: typography.sizes.xs,
  },
});

export default MemoryCard;
