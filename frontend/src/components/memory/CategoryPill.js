import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';
import { getCategoryIcon } from '../../utils/helpers';

export const CategoryPill = ({
  category,
  isSelected = false,
  onPress,
  showIcon = true,
  count,
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();
  const catColor = category === 'All' ? colors.primary : colors.categories[category] || colors.primary;
  const isSm = size === 'sm';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.pill,
        isSm ? styles.pillSm : styles.pillMd,
        isSelected
          ? {
              backgroundColor: catColor,
              borderColor: catColor,
              shadowColor: catColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 6,
              elevation: 3,
            }
          : {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
        style,
      ]}
    >
      {showIcon && category !== 'All' && (
        <Ionicons
          name={getCategoryIcon(category)}
          size={isSm ? 13 : 15}
          color={isSelected ? '#FFFFFF' : catColor}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.label,
          isSm ? styles.labelSm : styles.labelMd,
          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
        ]}
      >
        {category}
      </Text>
      {count !== undefined && (
        <Text
          style={[
            styles.count,
            { color: isSelected ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  pillSm: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillMd: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: 5,
  },
  label: {
    fontWeight: typography.weights.semibold,
  },
  labelSm: {
    fontSize: typography.sizes.xs,
  },
  labelMd: {
    fontSize: typography.sizes.sm,
  },
  count: {
    fontSize: typography.sizes.xs,
    marginLeft: 4,
    opacity: 0.8,
  },
});

export default CategoryPill;
