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
import { loginUser, clearAuthError } from '../../store/slices/authSlice';
import { ROUTES } from '../../navigation/routes';

export const LoginScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { isLoading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientErrors, setClientErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!password) {
      errs.password = 'Password is required';
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (error) dispatch(clearAuthError());
    if (!validate()) return;

    await dispatch(
      loginUser({
        email: email.trim().toLowerCase(),
        password,
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
          <Badge label="Secure Login" variant="primary" icon="lock-closed-outline" size="sm" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to access and talk to your recorded memories.
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

        {/* Inputs */}
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
            label="Password"
            placeholder="Enter your password"
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

          <View style={styles.forgotRow}>
            <TouchableOpacity
              onPress={() => {
                if (error) dispatch(clearAuthError());
                navigation.navigate(ROUTES.FORGOT_PASSWORD, { prefillEmail: email });
              }}
            >
              <Text style={[styles.forgotLink, { color: colors.primaryLight }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Sign In"
            variant="primary"
            size="lg"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitBtn}
          />
        </View>

        {/* Quick Demo Hint */}
        <View style={[styles.demoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryLight} />
          <Text style={[styles.demoText, { color: colors.textSecondary }]}>
            Real MongoDB auth active. New users can sign up instantly or log in with their created account.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate(ROUTES.SIGNUP)}>
            <Text style={[styles.footerLink, { color: colors.primaryLight }]}>
              Create one
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
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: spacing.xs,
  },
  forgotLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  demoText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
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

export default LoginScreen;
