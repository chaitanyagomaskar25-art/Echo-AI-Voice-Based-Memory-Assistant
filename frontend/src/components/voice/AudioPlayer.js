import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';
import { formatDuration } from '../../utils/dateFormatter';

export const AudioPlayer = ({
  audioUrl,
  duration = 15,
  title = 'Recorded Memo',
  style,
}) => {
  const { colors, isDark } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlaybackPosition((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, duration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const progressPercent = Math.min(100, (playbackPosition / (duration || 1)) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={togglePlay}
        style={styles.playButtonWrapper}
      >
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.playGradient}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color="#FFFFFF"
            style={!isPlaying ? { marginLeft: 2 } : null}
          />
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.trackContainer}>
        <View style={styles.infoRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatDuration(playbackPosition)} / {formatDuration(duration)}
          </Text>
        </View>

        {/* Progress Track */}
        <View style={[styles.progressBarBackground, { backgroundColor: colors.cardSecondary }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%`, backgroundColor: colors.primaryLight },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  playButtonWrapper: {
    marginRight: spacing.md,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  playGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackContainer: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    flex: 1,
    marginRight: spacing.sm,
  },
  timeText: {
    fontSize: typography.sizes.xs,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weights.medium,
  },
  progressBarBackground: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
});

export default AudioPlayer;
