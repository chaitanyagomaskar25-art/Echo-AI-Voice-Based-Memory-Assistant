import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/spacing';

export const SkeletonItem = ({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.75,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? colors.surface : 'rgba(0,0,0,0.08)',
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const MemoryCardSkeleton = ({ style }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <SkeletonItem width={70} height={20} borderRadius={10} />
        <SkeletonItem width={80} height={14} />
      </View>
      <SkeletonItem width="85%" height={18} style={{ marginVertical: 10 }} />
      <SkeletonItem width="98%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonItem width="60%" height={14} style={{ marginBottom: 12 }} />
      <View style={styles.footerRow}>
        <SkeletonItem width={90} height={22} borderRadius={11} />
        <SkeletonItem width={30} height={22} borderRadius={11} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
});

export default { SkeletonItem, MemoryCardSkeleton };
