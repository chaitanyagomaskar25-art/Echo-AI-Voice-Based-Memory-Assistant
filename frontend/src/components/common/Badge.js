import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';

export const Badge = ({
  label,
  color,
  bgColor,
  size = 'md',
  style,
  textStyle,
}) => {
  const { colors, isDark } = useTheme();
  const badgeColor = color || colors.primaryLight;
  const isSm = size === 'sm';
  const background = bgColor || (isDark ? `${badgeColor}18` : `${badgeColor}12`);

  return (
    <View
      style={[
        styles.badge,
        isSm ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: background, borderColor: `${badgeColor}35` },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          isSm ? styles.textSm : styles.textMd,
          { color: badgeColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontWeight: typography.weights.semibold,
  },
  textSm: {
    fontSize: typography.sizes.xxs,
  },
  textMd: {
    fontSize: typography.sizes.xs,
  },
});

export default Badge;
