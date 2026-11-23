import React, { useState } from 'react';
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
import { resetPassword, clearAuthError } from '../../store/slices/authSlice';
import { ROUTES } from '../../navigation/routes';

export const ResetPasswordScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { isLoading, error, passwordResetSuccess } = useSelector((state) => state.auth);

  const [email, setEmail] = useState(route?.params?.prefillEmail || '');
  const [resetCode, setResetCode] = useState(route?.params?.prefillCode || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientErrors, setClientErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    if (!resetCode.trim()) {
      errs.resetCode = '6-digit verification code is required';
    } else if (resetCode.trim().length < 6) {
      errs.resetCode = 'Code must be 6 digits';
    }
    if (!newPassword) {
      errs.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleReset = async () => {
    if (error) dispatch(clearAuthError());
    if (!validate()) return;

    await dispatch(
      resetPassword({
        email: email.trim().toLowerCase(),
        resetCode: resetCode.trim(),
        newPassword,
      })
    );
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
            if (error) dispatch(clearAuthError());
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Badge label="Password Security" variant="primary" icon="key-outline" size="sm" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Reset Password
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your 6-digit code and choose a new password.
          </Text>
        </View>

        {/* Server Error Alert */}
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

        {/* Form Inputs */}
        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="alex@example.com"
            value={email}
            onChangeText={(txt) => {
              setEmail(txt);
              if (clientErrors.email) setClientErrors({ ...clientErrors, email: null });
            }}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            error={clientErrors.email}
          />

          <Input
            label="6-Digit Verification Code"
            placeholder="123456"
            value={resetCode}
            onChangeText={(txt) => {
              setResetCode(txt);
              if (clientErrors.resetCode) setClientErrors({ ...clientErrors, resetCode: null });
            }}
            icon="shield-outline"
            keyboardType="number-pad"
            maxLength={6}
            error={clientErrors.resetCode}
          />

          <Input
            label="New Password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChangeText={(txt) => {
              setNewPassword(txt);
              if (clientErrors.newPassword) setClientErrors({ ...clientErrors, newPassword: null });
            }}
            icon="lock-closed-outline"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            error={clientErrors.newPassword}
          />

          <Input
            label="Confirm New Password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChangeText={(txt) => {
              setConfirmPassword(txt);
              if (clientErrors.confirmPassword) {
                setClientErrors({ ...clientErrors, confirmPassword: null });
              }
            }}
            icon="shield-checkmark-outline"
            secureTextEntry={!showPassword}
            error={clientErrors.confirmPassword}
          />

          <Button
            title="Reset Password & Sign In"
            variant="primary"
            size="lg"
            onPress={handleReset}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitBtn}
          />

          <Button
            title="Cancel & Back to Sign In"
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
  form: {
    gap: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});

export default ResetPasswordScreen;
