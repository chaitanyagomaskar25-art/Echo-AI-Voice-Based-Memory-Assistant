import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';

const getEntityDetails = (type) => {
  switch (type) {
    case 'person':
      return { icon: 'person', color: '#8B5CF6' };
    case 'location':
      return { icon: 'location', color: '#06B6D4' };
    case 'date':
      return { icon: 'calendar', color: '#10B981' };
    case 'object':
      return { icon: 'cube', color: '#F59E0B' };
    case 'action':
      return { icon: 'flash', color: '#EC4899' };
    default:
      return { icon: 'pricetag', color: '#6366F1' };
  }
};

export const EntityChips = ({ entities = [], maxDisplay = 4, style }) => {
  const { colors, isDark } = useTheme();

  if (!entities || entities.length === 0) return null;

  const displayList = entities.slice(0, maxDisplay);
  const remaining = entities.length - maxDisplay;

  return (
    <View style={[styles.container, style]}>
      {displayList.map((ent, idx) => {
        const { icon, color } = getEntityDetails(ent.type);
        return (
          <View
            key={`${ent.name}-${idx}`}
            style={[
              styles.chip,
              {
                backgroundColor: isDark ? `${color}16` : `${color}10`,
                borderColor: `${color}35`,
              },
            ]}
          >
            <Ionicons name={icon} size={11} color={color} style={styles.icon} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {ent.name}
            </Text>
          </View>
        );
      })}
      {remaining > 0 && (
        <View style={[styles.moreChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.moreText, { color: colors.textSecondary }]}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  moreChip: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  moreText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});

export default EntityChips;
