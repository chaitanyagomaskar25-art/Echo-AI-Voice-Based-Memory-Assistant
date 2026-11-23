import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CategoryPill from '../components/memory/CategoryPill';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { formatDuration } from '../utils/dateFormatter';
import { API_BASE_URL } from '../config/env';
import { retryTranscription, updateTranscript } from '../store/slices/audioSlice';
import { ROUTES } from '../navigation/routes';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'auto', label: 'Auto-Detect', flag: '🌐' },
];

export const TranscriptionReviewScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();

  const {
    memoryId,
    audioUrl,
    initialTranscript = '',
    initialTitle = 'Voice Memory',
    initialCategory = 'Ideas',
    initialLanguage = 'en',
    transcriptionStatus = 'completed',
    transcriptionError = null,
  } = route.params || {};

  const { retryLoading, updateLoading } = useSelector((state) => state.audio);

  // Editable Form State
  const [transcript, setTranscript] = useState(initialTranscript);
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [status, setStatus] = useState(transcriptionStatus);
  const [errorText, setErrorText] = useState(transcriptionError);

  // Audio Playback State
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Resolve full audio URL (if relative like /uploads/..., prefix with backend base URL)
  const fullAudioUri = audioUrl
    ? audioUrl.startsWith('http') || audioUrl.startsWith('file://')
      ? audioUrl
      : `${API_BASE_URL.replace('/api', '')}${audioUrl}`
    : null;

  useEffect(() => {
    loadAudioPlayer();

    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [fullAudioUri]);

  const loadAudioPlayer = async () => {
    if (!fullAudioUri) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: newSound, status: soundStatus } = await Audio.Sound.createAsync(
        { uri: fullAudioUri },
        { shouldPlay: false, rate: playbackSpeed },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      if (soundStatus.isLoaded) {
        setPlaybackDuration(soundStatus.durationMillis || 0);
      }
    } catch (err) {
      console.warn('[TranscriptionReview] Audio preview load notice:', err.message);
    }
  };

  const onPlaybackStatusUpdate = (playbackStatus) => {
    if (playbackStatus.isLoaded) {
      setPlaybackPosition(playbackStatus.positionMillis);
      setPlaybackDuration(playbackStatus.durationMillis || 0);
      setIsPlaying(playbackStatus.isPlaying);

      if (playbackStatus.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };

  const handleTogglePlayPause = async () => {
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        if (playbackPosition >= playbackDuration && playbackDuration > 0) {
          await sound.replayAsync();
        } else {
          await sound.playAsync();
        }
      }
    } catch (err) {
      console.warn('[AudioPlayer] Play/Pause error:', err.message);
    }
  };

  const handleToggleSpeed = async () => {
    if (!sound) return;
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);
    try {
      await sound.setRateAsync(newSpeed, true);
    } catch (err) {
      // Ignore
    }
  };

  // Retry Failed Transcription using backend speech service
  const handleRetryTranscription = async () => {
    if (!memoryId) {
      Alert.alert('Notice', 'No saved memory ID available to retry.');
      return;
    }

    setErrorText(null);
    setStatus('processing');

    const result = await dispatch(
      retryTranscription({
        memoryId,
        language: selectedLanguage,
      })
    );

    if (result.meta.requestStatus === 'fulfilled') {
      const updatedMem = result.payload;
      setTranscript(updatedMem.transcript || '');
      setTitle(updatedMem.title || title);
      setCategory(updatedMem.category || category);
      setStatus('completed');
      setErrorText(null);
      Alert.alert('Success', 'Audio was re-transcribed and AI entities updated!');
    } else {
      setStatus('failed');
      setErrorText(result.payload || 'Speech-to-text retry failed.');
    }
  };

  // Save Final Edited Transcript to MongoDB
  const handleSaveTranscript = async () => {
    if (!transcript.trim()) {
      Alert.alert('Empty Transcript', 'Please enter or keep transcribed text before saving.');
      return;
    }

    if (memoryId) {
      const result = await dispatch(
        updateTranscript({
          memoryId,
          transcript: transcript.trim(),
          title: title.trim(),
          category,
        })
      );

      if (result.meta.requestStatus === 'fulfilled') {
        Alert.alert(
          'Transcript Updated',
          'Your edits and AI memory associations were saved to MongoDB!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate(ROUTES.MEMORIES),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.payload || 'Failed to save transcript update.');
      }
    } else {
      Alert.alert('Saved', 'Transcript recorded successfully.');
      navigation.navigate(ROUTES.HOME);
    }
  };

  // Word and character counts
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Speech Transcription
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Powered by OpenAI Whisper STT API
            </Text>
          </View>
        </View>

        {/* 1. Status & Transcription Progress Banner */}
        <Card
          variant={status === 'completed' ? 'glass' : status === 'failed' ? 'default' : 'highlight'}
          style={[
            styles.statusCard,
            status === 'failed' && { borderColor: colors.recordRed },
          ]}
        >
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusBadgeRow}>
              {status === 'processing' ? (
                <ActivityIndicator size="small" color={colors.primaryLight} />
              ) : (
                <Ionicons
                  name={status === 'completed' ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={status === 'completed' ? colors.emerald : colors.recordRed}
                />
              )}
              <Text
                style={[
                  styles.statusTitle,
                  {
                    color:
                      status === 'completed'
                        ? colors.emerald
                        : status === 'failed'
                        ? colors.recordRed
                        : colors.primaryLight,
                  },
                ]}
              >
                {status === 'completed'
                  ? 'Transcription Completed'
                  : status === 'processing'
                  ? 'Transcribing Speech via Whisper API...'
                  : 'Transcription Failed'}
              </Text>
            </View>

            <Badge
              label={`Whisper STT (${selectedLanguage.toUpperCase()})`}
              variant={status === 'completed' ? 'success' : 'warning'}
              size="sm"
            />
          </View>

          {errorText ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorDetailText, { color: colors.recordRed }]}>
                {errorText}
              </Text>
            </View>
          ) : (
            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
              Audio converted to text via backend Whisper provider. You can edit the transcript below.
            </Text>
          )}
        </Card>

        {/* 2. Original Audio Playback Player */}
        {fullAudioUri && (
          <Card style={styles.audioPlayerCard}>
            <View style={styles.playerHeaderRow}>
              <View style={styles.playerTitleRow}>
                <Ionicons name="volume-medium-outline" size={16} color={colors.primaryLight} style={{ marginRight: 6 }} />
                <Text style={[styles.playerHeaderTitle, { color: colors.textPrimary }]}>
                  Original Audio Playback
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleToggleSpeed}
                style={[styles.speedChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.speedText, { color: colors.primaryLight }]}>
                  {playbackSpeed}x
                </Text>
              </TouchableOpacity>
            </View>

            {/* Play/Pause & Progress Scrubber */}
            <View style={styles.playerControlsRow}>
              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: colors.primary }]}
                onPress={handleTogglePlayPause}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={20}
                  color="#FFFFFF"
                  style={!isPlaying ? { marginLeft: 2 } : {}}
                />
              </TouchableOpacity>

              <View style={styles.progressTrackContainer}>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.surface }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${
                          playbackDuration > 0
                            ? Math.min(100, (playbackPosition / playbackDuration) * 100)
                            : 0
                        }%`,
                        backgroundColor: colors.primaryLight,
                      },
                    ]}
                  />
                </View>
                <View style={styles.timeLabelsRow}>
                  <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                    {formatDuration(Math.round(playbackPosition / 1000))}
                  </Text>
                  <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                    {formatDuration(Math.round(playbackDuration / 1000))}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* 3. Language Selector Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Whisper Language Target
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langScroll}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => setSelectedLanguage(lang.code)}
                  style={[
                    styles.langChip,
                    {
                      backgroundColor: isSelected ? colors.primary + '25' : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.langText,
                      {
                        color: isSelected ? colors.primaryLight : colors.textSecondary,
                        fontWeight: isSelected ? typography.weights.bold : typography.weights.medium,
                      },
                    ]}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. Retry Failed Transcription Button (If status failed or requested) */}
        {(status === 'failed' || status === 'processing' || memoryId) && (
          <View style={styles.retryWrap}>
            <Button
              title={retryLoading ? 'Retrying Speech-to-Text...' : 'Re-transcribe with Whisper API'}
              variant="outline"
              size="md"
              icon="refresh-outline"
              onPress={handleRetryTranscription}
              loading={retryLoading}
              disabled={retryLoading}
            />
          </View>
        )}

        {/* 5. Editable Title & Category */}
        <Card style={styles.editorCard}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Memory Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Short title for memory..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.titleInput,
              { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
            ]}
          />

          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            Category (Tap to change)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 6 }}>
            {['Ideas', 'Work', 'Study', 'Personal', 'Tasks'].map((cat) => (
              <CategoryPill
                key={cat}
                category={cat}
                isSelected={category === cat}
                onPress={() => setCategory(cat)}
                size="sm"
              />
            ))}
          </ScrollView>
        </Card>

        {/* 6. Editable Transcript Area */}
        <Card style={styles.editorCard}>
          <View style={styles.editorHeaderRow}>
            <View style={styles.editorTitleRow}>
              <Ionicons name="create-outline" size={16} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={[styles.editorTitle, { color: colors.textPrimary }]}>
                Editable Transcript
              </Text>
            </View>

            <View style={styles.counterRow}>
              <Text style={[styles.counterText, { color: colors.textMuted }]}>
                {wordCount} words • {charCount} chars
              </Text>
            </View>
          </View>

          <TextInput
            value={transcript}
            onChangeText={setTranscript}
            multiline
            placeholder="Whisper speech transcript will appear here..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.transcriptTextInput,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
          />

          {/* Quick Info & Action buttons */}
          <View style={styles.saveActionsWrap}>
            <Button
              title="Save & Finalize Memory"
              variant="primary"
              size="lg"
              icon="checkmark-circle-outline"
              onPress={handleSaveTranscript}
              loading={updateLoading}
              disabled={updateLoading}
              style={{ width: '100%' }}
            />
          </View>
        </Card>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  statusCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  statusSubtitle: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  errorBox: {
    marginTop: 6,
  },
  errorDetailText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  audioPlayerCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  playerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  playerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerHeaderTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  speedChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  speedText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  playerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrackContainer: {
    flex: 1,
    gap: 4,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: typography.sizes.xxs,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginBottom: 6,
  },
  langScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    gap: 6,
  },
  langFlag: {
    fontSize: 14,
  },
  langText: {
    fontSize: typography.sizes.xs,
  },
  retryWrap: {
    marginBottom: spacing.md,
  },
  editorCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  titleInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  editorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  editorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  counterRow: {},
  counterText: {
    fontSize: typography.sizes.xxs,
  },
  transcriptTextInput: {
    minHeight: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  saveActionsWrap: {
    marginTop: spacing.md,
  },
});

export default TranscriptionReviewScreen;
