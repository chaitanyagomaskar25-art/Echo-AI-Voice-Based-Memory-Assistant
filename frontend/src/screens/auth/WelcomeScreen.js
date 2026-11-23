import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { ROUTES } from '../../navigation/routes';

export const WelcomeScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    // Fade and slide in content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle breathing pulse on the glowing center orb
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const features = [
    {
      icon: 'mic-circle-outline',
      title: 'Frictionless Voice Capture',
      desc: 'Speak freely anytime. Echo records, transcribes, and extracts key entities automatically.',
    },
    {
      icon: 'sparkles-outline',
      title: 'Contextual AI Memory',
      desc: 'Smart semantic clustering, importance rating, and automated action item tracking.',
    },
    {
      icon: 'chatbubble-ellipses-outline',
      title: 'Conversational Recall',
      desc: 'Ask questions naturally: "What did I decide in Tuesdays meeting?" and get direct answers.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 24) + 16, paddingBottom: Math.max(insets.bottom, 24) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Hero Orb */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.orbOuter,
              {
                borderColor: colors.primaryLight + '30',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#7C3AED', '#4F46E5', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbGradient}
            >
              <Ionicons name="finger-print-outline" size={46} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          <View style={styles.badgeRow}>
            <Badge label="AI Voice Intelligence" variant="primary" icon="sparkles" size="md" />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Echo
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Voice your thoughts. Echo remembers everything.
          </Text>
        </Animated.View>

        {/* Feature Highlights */}
        <Animated.View
          style={[
            styles.featuresList,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {features.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.featureCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.featureIconWrap,
                  { backgroundColor: colors.primary + '18' },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={colors.primaryLight} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Button
            title="Get Started"
            icon="arrow-forward"
            iconPosition="right"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate(ROUTES.SIGNUP)}
            style={styles.primaryBtn}
          />

          <Button
            title="I already have an account"
            variant="glass"
            size="lg"
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
            style={styles.secondaryBtn}
          />

          <Text style={[styles.legalNote, { color: colors.textTertiary }]}>
            By proceeding, you agree to secure encrypted voice memory storage.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  orbOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  orbGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 34,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.sizes.md,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.md,
    textAlign: 'center',
    maxWidth: 290,
  },
  featuresList: {
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryBtn: {
    width: '100%',
  },
  legalNote: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default WelcomeScreen;
