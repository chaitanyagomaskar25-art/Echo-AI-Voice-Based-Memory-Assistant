import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export const RecordButton = ({
  isRecording = false,
  onPress,
  disabled = false,
  size = 80,
  style,
}) => {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop;
    if (isRecording) {
      loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(ring1Anim, {
              toValue: 1.55,
              duration: 1400,
              useNativeDriver: true,
            }),
            Animated.timing(ring1Anim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(ring2Anim, {
              toValue: 1.8,
              duration: 1400,
              useNativeDriver: true,
            }),
            Animated.timing(ring2Anim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
      ring1Anim.setValue(1);
      ring2Anim.setValue(1);
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [isRecording]);

  const gradientColors = isRecording
    ? colors.gradientRecord
    : colors.gradientPrimary;

  const glowColor = isRecording ? colors.recordRed : colors.primary;

  return (
    <View style={[styles.wrapper, { width: size * 1.8, height: size * 1.8 }, style]}>
      {/* Outer Pulse Ring 2 */}
      {isRecording && (
        <Animated.View
          style={[
            styles.outerRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: colors.recordRed,
              transform: [{ scale: ring2Anim }],
              opacity: ring2Anim.interpolate({
                inputRange: [1, 1.8],
                outputRange: [0.4, 0],
              }),
            },
          ]}
        />
      )}

      {/* Outer Pulse Ring 1 */}
      {isRecording && (
        <Animated.View
          style={[
            styles.outerRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: colors.recordRed,
              transform: [{ scale: ring1Anim }],
              opacity: ring1Anim.interpolate({
                inputRange: [1, 1.55],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
      )}

      {/* Main Core Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [{ scale: pulseAnim }],
            shadowColor: glowColor,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          disabled={disabled}
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
          />
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={size * 0.44}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  buttonContainer: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default RecordButton;
