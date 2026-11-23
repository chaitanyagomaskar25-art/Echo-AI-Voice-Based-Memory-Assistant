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
import { registerUser, clearAuthError } from '../../store/slices/authSlice';
import { ROUTES } from '../../navigation/routes';

export const SignUpScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { isLoading, error } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientErrors, setClientErrors] = useState({});

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: 'Empty', score: 0, color: colors.border };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { label: 'Weak', score: 1, color: colors.recordRed };
    if (score === 2 || score === 3) return { label: 'Moderate', score: 2, color: colors.accent };
    return { label: 'Strong', score: 3, color: colors.success };
  };

  const strength = getPasswordStrength(password);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignUp = async () => {
    if (error) dispatch(clearAuthError());
    if (!validate()) return;

    const res = await dispatch(
      registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
    );

    if (res.meta.requestStatus === 'fulfilled') {
      // User registered successfully - navigate to profile setup or main flow
      navigation.navigate(ROUTES.PROFILE_SETUP);
    }
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
          <Badge label="New Account" variant="primary" icon="person-add-outline" size="sm" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Create your account
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unlock AI voice capture, automatic summaries, and semantic recall.
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
            label="Full Name"
            placeholder="e.g. Alex Rivers"
            value={name}
            onChangeText={(txt) => {
              setName(txt);
              if (clientErrors.name) setClientErrors({ ...clientErrors, name: null });
            }}
            icon="person-outline"
            error={clientErrors.name}
            autoCapitalize="words"
          />

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
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={(txt) => {
              setPassword(txt);
              if (clientErrors.password) setClientErrors({ ...clientErrors, password: null });
            }}
            icon="lock-closed-outline"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            error={clientErrors.password}
          />

          {/* Password strength bar */}
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                <View
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor: strength.score >= 1 ? strength.color : colors.border,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor: strength.score >= 2 ? strength.color : colors.border,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor: strength.score >= 3 ? strength.color : colors.border,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>
                Strength: {strength.label}
              </Text>
            </View>
          )}

          <Input
            label="Confirm Password"
            placeholder="Repeat your password"
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
            title="Create Account"
            variant="primary"
            size="lg"
            onPress={handleSignUp}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitBtn}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate(ROUTES.LOGIN)}>
            <Text style={[styles.footerLink, { color: colors.primaryLight }]}>
              Sign In
            </Text>
          </TouchableOpacity>
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -4,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    marginRight: spacing.md,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: typography.sizes.sm,
  },
  footerLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});

export default SignUpScreen;
