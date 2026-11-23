import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';

export const Card = ({
  children,
  onPress,
  style,
  variant = 'default', // 'default' | 'elevated' | 'glass' | 'highlight' | 'gradient'
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const CardWrapper = onPress ? TouchableOpacity : View;

  const getVariantStyles = () => {
    switch (variant) {
      case 'glass':
        return {
          backgroundColor: colors.glassBackground,
          borderColor: colors.borderActive,
        };
      case 'highlight':
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderActive,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.25 : 0.12,
          shadowRadius: 12,
          elevation: 5,
        };
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 14,
          elevation: 6,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        };
    }
  };

  return (
    <CardWrapper
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.base,
          getVariantStyles(),
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {variant === 'gradient' && (
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#121826'] : ['#EEF2FF', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: radius.card }]}
          />
        )}
        {children}
      </Animated.View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

export default Card;
