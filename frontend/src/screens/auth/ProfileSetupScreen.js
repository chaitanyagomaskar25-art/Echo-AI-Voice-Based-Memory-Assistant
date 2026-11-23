import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { updateUserProfile } from '../../store/slices/authSlice';
import { ROUTES } from '../../navigation/routes';

const AVATAR_OPTIONS = [
  { id: 'sparkles', icon: 'sparkles', label: 'AI Spark' },
  { id: 'mic', icon: 'mic', label: 'Voice' },
  { id: 'brain', icon: 'bulb-outline', label: 'Insight' },
  { id: 'flash', icon: 'flash', label: 'Energy' },
  { id: 'compass', icon: 'compass-outline', label: 'Navigator' },
  { id: 'planet', icon: 'planet-outline', label: 'Cosmos' },
];

const TONE_OPTIONS = [
  {
    tone: 'Balanced',
    title: 'Balanced (Recommended)',
    desc: 'Conversational, thorough yet concise summaries with all key facts.',
  },
  {
    tone: 'Concise',
    title: 'Concise & Bulleted',
    desc: 'Bullet-first synthesis, strict minimalism, zero fluff.',
  },
  {
    tone: 'Friendly',
    title: 'Warm & Encouraging',
    desc: 'Engaging, human-like affirmations and thoughtful follow-up questions.',
  },
  {
    tone: 'Professional',
    title: 'Executive & Structured',
    desc: 'Corporate-ready action items, deadlines, decisions, and clear entity tracking.',
  },
  {
    tone: 'Analytical',
    title: 'Deep & Analytical',
    desc: 'Root-cause breakdown, semantic associations, and cognitive insights.',
  },
];

export const ProfileSetupScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { user, isLoading } = useSelector((state) => state.auth);

  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'sparkles');
  const [selectedTone, setSelectedTone] = useState(user?.voiceTonePreference || 'Balanced');
  const [bio, setBio] = useState(user?.bio || '');

  const handleSave = async () => {
    const res = await dispatch(
      updateUserProfile({
        avatar: selectedAvatar,
        voiceTonePreference: selectedTone,
        bio: bio.trim(),
        profileSetupCompleted: true,
      })
    );

    if (res.meta.requestStatus === 'fulfilled') {
      navigation.navigate(ROUTES.MAIN_TABS);
    }
  };

  const handleSkip = () => {
    navigation.navigate(ROUTES.MAIN_TABS);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Badge label="Personalization" variant="primary" icon="options-outline" size="sm" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Personalize Echo
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Welcome, {user?.name || 'Explorer'}! Configure how Echo analyzes your voice memories and communicates with you.
          </Text>
        </View>

        {/* Section 1: Choose Avatar Symbol */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Select Your Avatar Identity
          </Text>
          <View style={styles.avatarGrid}>
            {AVATAR_OPTIONS.map((item) => {
              const isSelected = selectedAvatar === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedAvatar(item.id)}
                  style={[
                    styles.avatarCard,
                    {
                      backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={26}
                    color={isSelected ? colors.primaryLight : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.avatarLabel,
                      {
                        color: isSelected ? colors.primaryLight : colors.textSecondary,
                        fontWeight: isSelected ? typography.weights.bold : typography.weights.medium,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: AI Voice Tone Preference */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            AI Voice Tone & Synthesis
          </Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            How Echo should summarize and answer your memory queries.
          </Text>

          <View style={styles.toneList}>
            {TONE_OPTIONS.map((item) => {
              const isSelected = selectedTone === item.tone;
              return (
                <TouchableOpacity
                  key={item.tone}
                  onPress={() => setSelectedTone(item.tone)}
                  style={[
                    styles.toneCard,
                    {
                      backgroundColor: isSelected ? colors.primary + '18' : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.toneRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? colors.primary : colors.border },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                  </View>
                  <View style={styles.toneTextWrap}>
                    <Text
                      style={[
                        styles.toneTitle,
                        {
                          color: isSelected ? colors.primaryLight : colors.textPrimary,
                          fontWeight: isSelected
                            ? typography.weights.bold
                            : typography.weights.semibold,
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.toneDesc, { color: colors.textSecondary }]}>
                      {item.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: Short Bio / Context */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Context / Bio (Optional)
          </Text>
          <Input
            placeholder="e.g. Lead designer, startup founder, building next-gen UX tools"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            icon="document-text-outline"
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Save & Launch Echo"
            variant="primary"
            size="lg"
            icon="rocket-outline"
            iconPosition="right"
            onPress={handleSave}
            loading={isLoading}
            disabled={isLoading}
            style={styles.saveBtn}
          />

          <Button
            title="Skip for now"
            variant="ghost"
            size="md"
            onPress={handleSkip}
          />
        </View>
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
  },
  header: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
    marginTop: 4,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.sm,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  avatarCard: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 6,
  },
  avatarLabel: {
    fontSize: typography.sizes.xs,
  },
  toneList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  toneCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  toneRadio: {
    paddingTop: 2,
    marginRight: spacing.sm,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toneTextWrap: {
    flex: 1,
  },
  toneTitle: {
    fontSize: typography.sizes.sm,
    marginBottom: 2,
  },
  toneDesc: {
    fontSize: typography.sizes.xs,
    lineHeight: 17,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveBtn: {
    width: '100%',
  },
});

export default ProfileSetupScreen;
