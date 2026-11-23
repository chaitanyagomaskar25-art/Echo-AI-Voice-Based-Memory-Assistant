import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import typography from '../../theme/typography';

export const LoadingSpinner = ({ message = 'Loading...', fullScreen = false }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, fullScreen && { flex: 1, backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
    fontWeight: typography.weights.medium,
  },
});

export default LoadingSpinner;
