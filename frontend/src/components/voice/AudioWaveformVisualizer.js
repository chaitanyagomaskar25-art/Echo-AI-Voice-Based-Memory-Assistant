import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export const AudioWaveformVisualizer = ({
  isRecording = false,
  isPaused = false,
  isPlaying = false,
  metering = -40,
  barCount = 30,
  height = 84,
  style,
}) => {
  const { colors, isDark } = useTheme();

  // Create animated values for each bar
  const animations = useRef(
    Array.from({ length: barCount }, (_, i) => {
      const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
      return new Animated.Value(Math.max(0.12, centerFactor * 0.45));
    })
  ).current;

  useEffect(() => {
    let interval;
    const active = isRecording && !isPaused;

    if (active) {
      // Normalize metering (-60dB to 0dB -> 0.1 to 1.0)
      const normalizedMetering = Math.min(
        1.0,
        Math.max(0.15, (metering + 60) / 60)
      );

      interval = setInterval(() => {
        animations.forEach((anim, i) => {
          const centerDist = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
          const jitter = (Math.random() - 0.5) * 0.35;
          const target = Math.min(
            1.0,
            Math.max(0.12, normalizedMetering * 0.85 + jitter + centerDist * 0.25)
          );

          Animated.timing(anim, {
            toValue: target,
            duration: 80,
            useNativeDriver: false,
          }).start();
        });
      }, 85);
    } else if (isPaused) {
      // Frozen / resting state during pause
      animations.forEach((anim, i) => {
        const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
        Animated.timing(anim, {
          toValue: Math.max(0.18, centerFactor * 0.35),
          duration: 180,
          useNativeDriver: false,
        }).start();
      });
    } else {
      // Gentle idle wave
      animations.forEach((anim, i) => {
        const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
        Animated.timing(anim, {
          toValue: Math.max(0.1, centerFactor * 0.3),
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused, isPlaying, metering]);

  const activeColor = isPaused
    ? colors.amber
    : isRecording
    ? colors.recordRed
    : isPlaying
    ? colors.emerald
    : colors.primaryLight;

  return (
    <View style={[styles.container, { height }, style]}>
      {animations.map((anim, index) => {
        const barHeight = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [6, height - 12],
        });

        const barOpacity = anim.interpolate({
          inputRange: [0.1, 1],
          outputRange: [0.35, 1],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: barHeight,
                opacity: barOpacity,
                backgroundColor: activeColor,
                shadowColor: isRecording ? colors.recordRed : colors.primary,
                shadowOpacity: isRecording ? 0.4 : 0,
                shadowRadius: 6,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3.5,
    width: '100%',
    paddingHorizontal: 8,
  },
  bar: {
    flex: 1,
    maxWidth: 4.5,
    minWidth: 2.5,
    borderRadius: 2.5,
  },
});

export default AudioWaveformVisualizer;
