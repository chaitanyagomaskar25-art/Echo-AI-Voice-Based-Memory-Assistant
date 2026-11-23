import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
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
import { requestForgotPassword, clearAuthError, clearResetState } from '../../store/slices/authSlice';
import { ROUTES } from '../../navigation/routes';

export const ForgotPasswordScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { isLoading, error, resetCodeSentInfo } = useSelector((state) => state.auth);

  const initialEmail = route?.params?.prefillEmail || '';
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    dispatch(clearResetState());
  }, []);

  const handleSendCode = async () => {
    if (error) dispatch(clearAuthError());
    if (!email.trim()) {
      setEmailError('Please enter your account email');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    await dispatch(requestForgotPassword(email.trim().toLowerCase()));
  };

  const handleProceedToReset = () => {
    navigation.navigate(ROUTES.RESET_PASSWORD, {
      prefillEmail: email.trim().toLowerCase(),
      prefillCode: resetCodeSentInfo?.resetCode || '',
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => {
            dispatch(clearResetState());
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Badge label="Account Recovery" variant="warning" icon="key-outline" size="sm" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Forgot Password?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and Echo will generate a 6-digit verification code.
          </Text>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.recordRed + '18', borderColor: colors.recordRed + '40' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.recordRed} />
            <Text style={[styles.errorBannerText, { color: colors.recordRed }]}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => dispatch(clearAuthError())}>
              <Ionicons name="close" size={18} color={colors.recordRed} />
            </TouchableOpacity>
          </View>
        )}

        {/* Code Sent Success Banner */}
        {resetCodeSentInfo && (
          <View style={[styles.successBanner, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.successTitle, { color: colors.success }]}>
                Verification Code Generated!
              </Text>
              <Text style={[styles.codeDisplay, { color: colors.textPrimary }]}>
                Code: {resetCodeSentInfo.resetCode}
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                Valid for {resetCodeSentInfo.expiresIn || '15 minutes'}. Tap below to proceed.
              </Text>
            </View>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="alex@example.com"
            value={email}
            onChangeText={(txt) => {
              setEmail(txt);
              if (emailError) setEmailError('');
            }}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
          />

          {!resetCodeSentInfo ? (
            <Button
              title="Send Verification Code"
              variant="primary"
              size="lg"
              onPress={handleSendCode}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitBtn}
            />
          ) : (
            <Button
              title="Enter Verification Code"
              variant="primary"
              size="lg"
              icon="arrow-forward"
              iconPosition="right"
              onPress={handleProceedToReset}
              style={styles.submitBtn}
            />
          )}

          <Button
            title="Back to Sign In"
            variant="ghost"
            size="md"
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  successTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  codeDisplay: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    letterSpacing: 3,
    marginVertical: 4,
  },
  successSubtitle: {
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  form: {
    gap: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
});

export default ForgotPasswordScreen;
