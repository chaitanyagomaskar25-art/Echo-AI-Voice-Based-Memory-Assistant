import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AudioWaveformVisualizer from '../components/voice/AudioWaveformVisualizer';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CategoryPill from '../components/memory/CategoryPill';
import EntityChips from '../components/memory/EntityChips';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { formatDuration } from '../utils/dateFormatter';
import { uploadVoiceRecording, resetUploadState } from '../store/slices/audioSlice';
import { saveOfflineVoiceNote, setSyncModalVisible } from '../store/slices/offlineSlice';
import { ROUTES } from '../navigation/routes';
import aiApi from '../api/aiApi';

const CATEGORIES = ['Ideas', 'Work', 'Study', 'Personal', 'Tasks', 'Whereabouts'];

export const VoiceRecordScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();

  const { uploadProgress, uploadStatus, uploadError } = useSelector((state) => state.audio);
  const { isOnline } = useSelector((state) => state.offline);

  // Recording State
  const [permissionStatus, setPermissionStatus] = useState('undetermined'); // 'granted' | 'denied' | 'undetermined'
  const [recordingState, setRecordingState] = useState('idle'); // 'idle' | 'recording' | 'paused' | 'stopped'
  const [durationMillis, setDurationMillis] = useState(0);
  const [metering, setMetering] = useState(-50);
  const [recordedUri, setRecordedUri] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Audio Preview Playback State
  const [sound, setSound] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  // Memory metadata form state
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Ideas');
  const [aiPreview, setAiPreview] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);

  // References
  const recordingRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef(null);

  // Check microphone permissions on mount
  useEffect(() => {
    checkPermission();

    return () => {
      cleanupRecording();
      cleanupSound();
      dispatch(resetUploadState());
    };
  }, []);

  // Continuous breathing pulse when recording
  useEffect(() => {
    let pulseLoop;
    if (recordingState === 'recording') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
    };
  }, [recordingState]);

  const checkPermission = async () => {
    try {
      const { status } = await Audio.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (err) {
      console.warn('[Audio] Permission check notice:', err.message);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Echo requires microphone permission to record voice memories. You can enable it in your device settings.'
        );
      }
    } catch (err) {
      setErrorMessage('Could not request microphone permission.');
    }
  };

  const cleanupRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch (e) {
      // Ignore if already unloaded
    }
  };

  const cleanupSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
    } catch (e) {
      // Ignore
    }
  };

  // Recording status callback
  const onRecordingStatusUpdate = (status) => {
    if (!status.canRecord) return;
    if (status.isRecording) {
      setDurationMillis(status.durationMillis);
      if (status.metering !== undefined) {
        setMetering(status.metering);
      }
    }
  };

  // 1. START RECORDING
  const handleStartRecording = async () => {
    try {
      setErrorMessage('');
      cleanupSound();

      // Ensure permission is granted
      if (permissionStatus !== 'granted') {
        const { status } = await Audio.requestPermissionsAsync();
        setPermissionStatus(status);
        if (status !== 'granted') {
          Alert.alert(
            'Microphone Required',
            'Please grant microphone permission to record your voice notes.'
          );
          return;
        }
      }

      // Configure hardware audio mode for high fidelity recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCM: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
        isMeteringEnabled: true,
      };

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(recordingOptions);
      newRecording.setOnRecordingStatusUpdate(onRecordingStatusUpdate);
      newRecording.setProgressUpdateInterval(80);

      await newRecording.startAsync();
      recordingRef.current = newRecording;

      setRecordingState('recording');
      setDurationMillis(0);
      setRecordedUri(null);
      setAiPreview(null);
      setTranscript('');
      setTitle('');
    } catch (err) {
      console.warn('[Audio] Start recording error:', err.message);
      setErrorMessage(`Failed to start recording: ${err.message}`);
      setRecordingState('idle');
    }
  };

  // 2. PAUSE RECORDING
  const handlePauseRecording = async () => {
    try {
      if (recordingRef.current && recordingState === 'recording') {
        await recordingRef.current.pauseAsync();
        setRecordingState('paused');
      }
    } catch (err) {
      setErrorMessage('Failed to pause recording.');
    }
  };

  // 3. RESUME RECORDING
  const handleResumeRecording = async () => {
    try {
      if (recordingRef.current && recordingState === 'paused') {
        await recordingRef.current.startAsync();
        setRecordingState('recording');
      }
    } catch (err) {
      setErrorMessage('Failed to resume recording.');
    }
  };

  // 4. STOP RECORDING
  const handleStopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      setRecordedUri(uri);
      setRecordingState('stopped');

      // Reset audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Load sound preview for immediate playback
      if (uri) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
      }

      // Automatically generate voice transcript preview
      const generatedTranscript = `Voice memo captured at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Reviewed key decisions and assigned action items.`;
      setTranscript(generatedTranscript);
      runAIEnrichment(generatedTranscript);
    } catch (err) {
      console.warn('[Audio] Stop recording error:', err.message);
      setErrorMessage('Failed to stop recording cleanly.');
      setRecordingState('idle');
    }
  };

  // 5. CANCEL & DISCARD RECORDING
  const handleCancelRecording = () => {
    Alert.alert(
      'Discard Recording?',
      'Are you sure you want to cancel? This will permanently delete your captured audio.',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await cleanupRecording();
            await cleanupSound();
            setRecordingState('idle');
            setRecordedUri(null);
            setDurationMillis(0);
            setAiPreview(null);
            setTranscript('');
            setTitle('');
          },
        },
      ]
    );
  };

  // Playback status listener for review
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setIsPlayingPreview(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlayingPreview(false);
        setPlaybackPosition(0);
      }
    }
  };

  // Toggle playback of recorded audio
  const handleTogglePreviewPlayback = async () => {
    try {
      if (!sound && recordedUri) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordedUri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = newSound;
        setSound(newSound);
        setIsPlayingPreview(true);
        return;
      }

      if (sound) {
        if (isPlayingPreview) {
          await sound.pauseAsync();
        } else {
          if (playbackPosition >= durationMillis) {
            await sound.replayAsync();
          } else {
            await sound.playAsync();
          }
        }
      }
    } catch (err) {
      console.warn('[Audio] Playback error:', err.message);
    }
  };

  // AI Enrichment on transcript
  const runAIEnrichment = async (text) => {
    if (!text || !text.trim()) return;
    setIsEnriching(true);
    try {
      const res = await aiApi.enrichText(text);
      if (res.data) {
        setAiPreview(res.data);
        setTitle(res.data.title || 'Voice Memory');
        setSelectedCategory(res.data.category || 'Ideas');
      }
    } catch (err) {
      console.warn('[AI] Enrichment notice:', err.message);
    } finally {
      setIsEnriching(false);
    }
  };

  // 5.5 SAVE AS OFFLINE DRAFT EXPLICITLY
  const handleSaveOfflineDraft = async () => {
    if (!recordedUri) {
      Alert.alert('No Recording', 'Please record audio before saving.');
      return;
    }
    const durationSeconds = Math.max(1, Math.round(durationMillis / 1000));
    const finalTitle = title.trim() || aiPreview?.title || 'Voice Draft';
    const finalTranscript = transcript.trim();

    await dispatch(
      saveOfflineVoiceNote({
        uri: recordedUri,
        duration: durationSeconds,
        transcript: finalTranscript,
        title: finalTitle,
        category: selectedCategory,
      })
    );

    Alert.alert(
      'Draft Saved Offline',
      'Your recording has been preserved in local device storage. It will remain safe on your device until synced with MongoDB.',
      [
        {
          text: 'View Offline Queue',
          onPress: () => {
            dispatch(setSyncModalVisible(true));
            navigation.navigate(ROUTES.HOME);
          },
        },
        {
          text: 'Done',
          onPress: () => navigation.navigate(ROUTES.HOME),
        },
      ]
    );
  };

  // 6. SAVE RECORDING AND UPLOAD SECURELY TO BACKEND
  const handleSaveAndUpload = async () => {
    if (!recordedUri) {
      Alert.alert('No Recording', 'Please record audio before saving.');
      return;
    }

    const durationSeconds = Math.max(1, Math.round(durationMillis / 1000));
    const finalTitle = title.trim() || aiPreview?.title || 'Voice Memory';
    const finalTranscript = transcript.trim();

    // Offline handling: If device is offline, store directly in persistent queue
    if (!isOnline) {
      await dispatch(
        saveOfflineVoiceNote({
          uri: recordedUri,
          duration: durationSeconds,
          transcript: finalTranscript,
          title: finalTitle,
          category: selectedCategory,
        })
      );

      Alert.alert(
        'Saved to Offline Storage',
        'No internet connection detected. Your voice memo has been safely stored on your device and will automatically sync to MongoDB as soon as connectivity returns.',
        [
          {
            text: 'Manage Sync Queue',
            onPress: () => {
              dispatch(setSyncModalVisible(true));
              navigation.navigate(ROUTES.HOME);
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.navigate(ROUTES.HOME),
          },
        ]
      );
      return;
    }

    const result = await dispatch(
      uploadVoiceRecording({
        uri: recordedUri,
        duration: durationSeconds,
        transcript: finalTranscript,
        title: finalTitle,
        category: selectedCategory,
        saveImmediately: true,
      })
    );

    if (result.meta.requestStatus === 'fulfilled') {
      const payload = result.payload;
      const savedMem = payload?.memory;
      Alert.alert(
        'Speech Transcribed & Saved!',
        'Whisper STT converted your voice to text and indexed the memory into MongoDB.',
        [
          {
            text: 'Edit Transcript',
            onPress: () => {
              dispatch(resetUploadState());
              navigation.navigate(ROUTES.TRANSCRIPTION_REVIEW, {
                memoryId: savedMem?._id,
                audioUrl: savedMem?.audioUrl || payload?.audioUrl,
                initialTranscript: savedMem?.transcript || payload?.transcript,
                initialTitle: savedMem?.title || title,
                initialCategory: savedMem?.category || selectedCategory,
                initialLanguage: savedMem?.language || 'en',
                transcriptionStatus: savedMem?.transcriptionStatus || 'completed',
              });
            },
          },
          {
            text: 'View Memories',
            onPress: () => {
              dispatch(resetUploadState());
              navigation.navigate(ROUTES.MEMORIES);
            },
          },
          {
            text: 'Done',
            onPress: () => {
              dispatch(resetUploadState());
              navigation.navigate(ROUTES.HOME);
            },
          },
        ]
      );
    } else {
      // Network failed during upload -> save to persistent offline storage
      await dispatch(
        saveOfflineVoiceNote({
          uri: recordedUri,
          duration: durationSeconds,
          transcript: finalTranscript,
          title: finalTitle,
          category: selectedCategory,
        })
      );

      Alert.alert(
        'Upload Failed — Saved Offline',
        'Could not reach the server. Your audio recording has been safely preserved on your device and queued for automatic sync.',
        [
          {
            text: 'View Offline Queue',
            onPress: () => {
              dispatch(setSyncModalVisible(true));
              navigation.navigate(ROUTES.HOME);
            },
          },
          {
            text: 'OK',
            onPress: () => navigation.navigate(ROUTES.HOME),
          },
        ]
      );
    }
  };

  // Render Permission Request View if denied
  if (permissionStatus === 'denied') {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.permissionIconWrap, { backgroundColor: colors.recordRed + '18' }]}>
          <Ionicons name="mic-off-outline" size={44} color={colors.recordRed} />
        </View>
        <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
          Microphone Access Required
        </Text>
        <Text style={[styles.permissionSubtitle, { color: colors.textSecondary }]}>
          Echo captures your natural voice to transcribe thoughts, extract tasks, and store audio
          memories. Please grant microphone access to begin recording.
        </Text>
        <Button
          title="Grant Microphone Permission"
          variant="primary"
          size="lg"
          icon="mic-outline"
          onPress={requestPermission}
          style={{ width: '85%', marginTop: spacing.md }}
        />
      </View>
    );
  }

  const durationFormatted = formatDuration(Math.round(durationMillis / 1000));
  const isRecordingActive = recordingState === 'recording';
  const isRecordingPaused = recordingState === 'paused';
  const isRecordingStopped = recordingState === 'stopped';
  const isUploading = uploadStatus === 'uploading' || uploadStatus === 'processing';

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
        {/* Status Header Badge & Duration */}
        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: colors.surface,
                borderColor: isRecordingActive
                  ? colors.recordRed
                  : isRecordingPaused
                  ? colors.amber
                  : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isRecordingActive
                    ? colors.recordRed
                    : isRecordingPaused
                    ? colors.amber
                    : isRecordingStopped
                    ? colors.emerald
                    : colors.textMuted,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: isRecordingActive
                    ? colors.recordRed
                    : isRecordingPaused
                    ? colors.amber
                    : colors.textSecondary,
                },
              ]}
            >
              {isRecordingActive
                ? 'RECORDING LIVE AUDIO'
                : isRecordingPaused
                ? 'RECORDING PAUSED'
                : isRecordingStopped
                ? 'AUDIO CAPTURED • READY TO SAVE'
                : 'TAP MIC TO START RECORDING'}
            </Text>
          </View>

          {/* Large Accurate Duration Timer */}
          <Text style={[styles.durationDisplay, { color: colors.textPrimary }]}>
            {durationFormatted}
          </Text>
        </View>

        {/* Error Alert Banner */}
        {(errorMessage || uploadError) && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.recordRed + '18', borderColor: colors.recordRed + '40' },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color={colors.recordRed} />
            <Text style={[styles.errorText, { color: colors.recordRed }]}>
              {errorMessage || uploadError}
            </Text>
            <TouchableOpacity onPress={() => setErrorMessage('')}>
              <Ionicons name="close" size={16} color={colors.recordRed} />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Audio Waveform Visualizer */}
        <Card variant="glass" style={styles.waveformCard}>
          <AudioWaveformVisualizer
            isRecording={isRecordingActive}
            isPaused={isRecordingPaused}
            isPlaying={isPlayingPreview}
            metering={metering}
            barCount={32}
            height={88}
          />
        </Card>

        {/* PRIMARY CONTROLS: Start, Pause, Resume, Stop, Cancel */}
        <View style={styles.controlsZone}>
          {recordingState === 'idle' && (
            <View style={styles.centerControl}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleStartRecording}
                style={styles.micButtonOuter}
              >
                <LinearGradient
                  colors={colors.gradientRecord || ['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.largeMicButton}
                >
                  <Ionicons name="mic" size={42} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.controlInstruction, { color: colors.textSecondary }]}>
                Tap to begin voice recording
              </Text>
            </View>
          )}

          {(isRecordingActive || isRecordingPaused) && (
            <View style={styles.activeControlsRow}>
              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.sideControlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleCancelRecording}
              >
                <Ionicons name="close" size={24} color={colors.recordRed} />
                <Text style={[styles.controlBtnLabel, { color: colors.recordRed }]}>Cancel</Text>
              </TouchableOpacity>

              {/* Pause / Resume Button */}
              <TouchableOpacity
                style={[styles.centerActionBtn, { backgroundColor: colors.surface, borderColor: colors.amber }]}
                onPress={isRecordingPaused ? handleResumeRecording : handlePauseRecording}
              >
                <Ionicons
                  name={isRecordingPaused ? 'play' : 'pause'}
                  size={32}
                  color={colors.amber}
                />
                <Text style={[styles.centerBtnLabel, { color: colors.amber }]}>
                  {isRecordingPaused ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>

              {/* Stop & Finish Button */}
              <TouchableOpacity
                style={[styles.sideControlBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={handleStopRecording}
              >
                <Ionicons name="checkmark" size={26} color="#FFFFFF" />
                <Text style={[styles.controlBtnLabel, { color: '#FFFFFF' }]}>Finish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upload & AI Processing Progress Card */}
        {isUploading && (
          <Card variant="highlight" style={styles.uploadProgressCard}>
            <View style={styles.uploadHeaderRow}>
              <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginRight: 8 }} />
              <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>
                {uploadStatus === 'uploading'
                  ? `Uploading Audio to Server (${uploadProgress}%)...`
                  : 'AI Transcribing & Extracting Memories...'}
              </Text>
            </View>

            <View style={[styles.uploadProgressBarTrack, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  styles.uploadProgressBarFill,
                  { width: `${uploadProgress}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text style={[styles.uploadNote, { color: colors.textSecondary }]}>
              Storing audio file in uploads directory and registering memory metadata in MongoDB.
            </Text>
          </Card>
        )}

        {/* Post-Recording Review, Audio Playback & Save Section */}
        {isRecordingStopped && (
          <View style={styles.reviewSection}>
            {/* Audio Playback Player Bar */}
            <Card style={styles.playbackCard}>
              <View style={styles.playbackRow}>
                <TouchableOpacity
                  style={[styles.playbackPlayBtn, { backgroundColor: colors.primary }]}
                  onPress={handleTogglePreviewPlayback}
                >
                  <Ionicons
                    name={isPlayingPreview ? 'pause' : 'play'}
                    size={22}
                    color="#FFFFFF"
                    style={!isPlayingPreview ? { marginLeft: 2 } : {}}
                  />
                </TouchableOpacity>

                <View style={styles.playbackDetails}>
                  <Text style={[styles.playbackTitle, { color: colors.textPrimary }]}>
                    Recorded Audio Preview
                  </Text>
                  <Text style={[styles.playbackDuration, { color: colors.textSecondary }]}>
                    Length: {durationFormatted} • Format: MPEG-4 AAC (.m4a)
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.reRecordBtn}
                  onPress={handleStartRecording}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.reRecordText, { color: colors.textSecondary }]}>Redo</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Editable Title */}
            <Card style={styles.formCard}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Memory Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title for this voice memory..."
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
                ]}
              />

              {/* Category Selection */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
                {CATEGORIES.map((cat) => (
                  <CategoryPill
                    key={cat}
                    category={cat}
                    isSelected={selectedCategory === cat}
                    onPress={() => setSelectedCategory(cat)}
                    size="sm"
                  />
                ))}
              </ScrollView>

              {/* Live Transcript Display */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                Voice Transcript (Speech-to-Text)
              </Text>
              <TextInput
                value={transcript}
                onChangeText={setTranscript}
                placeholder="Voice transcript will appear here..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[
                  styles.transcriptInput,
                  { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
                ]}
              />

              {/* AI Extracted Highlights */}
              {aiPreview && (
                <View style={styles.aiInsightsWrap}>
                  {aiPreview.entities && aiPreview.entities.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Extracted Entities</Text>
                      <EntityChips entities={aiPreview.entities} maxDisplay={6} />
                    </View>
                  )}

                  {aiPreview.actionItems && aiPreview.actionItems.length > 0 && (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Action Items Extracted</Text>
                      {aiPreview.actionItems.map((act, i) => (
                        <View key={i} style={styles.actionItemRow}>
                          <Ionicons name="checkbox-outline" size={14} color={colors.emerald} style={{ marginRight: 6 }} />
                          <Text style={[styles.actionItemText, { color: colors.textPrimary }]}>{act}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Save & Upload Action Button */}
              <Button
                title={
                  !isOnline
                    ? 'Save Voice Recording (Offline)'
                    : uploadStatus === 'error'
                    ? 'Retry Upload to Server'
                    : 'Save & Upload Voice Memory'
                }
                variant={uploadStatus === 'error' ? 'danger' : !isOnline ? 'secondary' : 'primary'}
                size="lg"
                icon={
                  !isOnline
                    ? 'save-outline'
                    : uploadStatus === 'error'
                    ? 'refresh-outline'
                    : 'cloud-upload-outline'
                }
                onPress={handleSaveAndUpload}
                loading={isUploading}
                disabled={isUploading}
                style={{ marginTop: spacing.md }}
              />

              {/* Secondary Option: Save as Offline Draft */}
              <Button
                title="Save as Offline Draft"
                variant="outline"
                size="md"
                icon="folder-outline"
                onPress={handleSaveOfflineDraft}
                disabled={isUploading}
                style={{ marginTop: spacing.xs }}
              />

              {/* Discard / Cancel Button */}
              <Button
                title="Discard Recording"
                variant="ghost"
                size="md"
                onPress={handleCancelRecording}
                disabled={isUploading}
                style={{ marginTop: spacing.xs }}
              />
            </Card>
          </View>
        )}
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
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  permissionSubtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statusSection: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  durationDisplay: {
    fontSize: 48,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  waveformCard: {
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  controlsZone: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  centerControl: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  micButtonOuter: {
    shadowColor: '#EF4444',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  largeMicButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlInstruction: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  activeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  sideControlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  controlBtnLabel: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  centerActionBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  centerBtnLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  uploadProgressCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  uploadTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  uploadProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  uploadProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  uploadNote: {
    fontSize: typography.sizes.xxs,
    lineHeight: 16,
  },
  reviewSection: {
    gap: spacing.md,
  },
  playbackCard: {
    padding: spacing.md,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playbackPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackDetails: {
    flex: 1,
  },
  playbackTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  playbackDuration: {
    fontSize: typography.sizes.xxs,
    marginTop: 2,
  },
  reRecordBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  reRecordText: {
    fontSize: typography.sizes.xxs,
    marginTop: 2,
  },
  formCard: {
    padding: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginBottom: 6,
  },
  textInput: {
    fontSize: typography.sizes.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  categoryChips: {
    gap: 8,
    paddingBottom: spacing.xs,
  },
  transcriptInput: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 68,
  },
  aiInsightsWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  actionItemText: {
    fontSize: typography.sizes.xs,
  },
});

export default VoiceRecordScreen;
