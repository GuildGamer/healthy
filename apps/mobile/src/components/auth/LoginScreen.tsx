import { colors, fontSize, spacing } from '@product/brand';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FormButton,
  FormErrorBanner,
  FormField,
  FieldMark,
  PasswordField,
  TextField,
} from '@/components/forms';
import { signIn, signInWithGoogle, waitForSession } from '@/lib/auth-client';
import { quirkyEmailPlaceholder } from '@/lib/form-placeholders';
import { AuthScreenHeader } from './AuthScreenHeader';
import { AuthMethodDivider, GoogleAuthButton } from './SocialAuthButton';

interface LoginScreenProps {
  onAuthenticated: () => void;
  onSignUpPress: () => void;
  onForgotPasswordPress: () => void;
  onBackPress: () => void;
}

const SIGN_IN_FAILED_MESSAGE = 'We could not log you in. Check your details and try again.';
const GOOGLE_FAILED_MESSAGE =
  'We could not continue with Google. Check your connection and try again.';
const NETWORK_FAILED_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

export function LoginScreen({
  onAuthenticated,
  onSignUpPress,
  onForgotPasswordPress,
  onBackPress,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [emailPlaceholder] = useState(quirkyEmailPlaceholder);

  const canSubmit = email.trim().length > 0 && password.length > 0;
  const busy = isSubmitting || isGoogleSubmitting;

  async function handleSubmit() {
    if (!canSubmit || busy) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signIn.email({ email: email.trim(), password });

      if (error) {
        setErrorMessage(SIGN_IN_FAILED_MESSAGE);
        return;
      }

      const hasSession = await waitForSession();
      if (!hasSession) {
        setErrorMessage(SIGN_IN_FAILED_MESSAGE);
        return;
      }

      onAuthenticated();
    } catch {
      setErrorMessage(NETWORK_FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (busy) return;

    setIsGoogleSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(GOOGLE_FAILED_MESSAGE);
        return;
      }

      const hasSession = await waitForSession();
      if (!hasSession) {
        setErrorMessage(GOOGLE_FAILED_MESSAGE);
        return;
      }

      onAuthenticated();
    } catch {
      setErrorMessage(NETWORK_FAILED_MESSAGE);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthScreenHeader
            onBackPress={onBackPress}
            subtitle="Log in to continue your health journey"
            title="Welcome Back"
          />

          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

          <GoogleAuthButton
            disabled={busy}
            loading={isGoogleSubmitting}
            onPress={handleGoogle}
            testID="login-google"
          />

          <AuthMethodDivider />

          <FormField label="Email" required>
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              leading={<FieldMark role="email" />}
              onChangeText={setEmail}
              placeholder={emailPlaceholder}
              testID="login-email"
              value={email}
            />
          </FormField>

          <FormField label="Password" required>
            <PasswordField
              autoComplete="current-password"
              onChangeText={setPassword}
              placeholder="Enter your password"
              testID="login-password"
              value={password}
            />
          </FormField>

          <Pressable
            accessibilityRole="button"
            onPress={onForgotPasswordPress}
            style={styles.forgotRow}
            testID="login-forgot-password"
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </Pressable>

          <FormButton
            disabled={!canSubmit || busy}
            label="Log In"
            loading={isSubmitting}
            onPress={handleSubmit}
            testID="login-submit"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Pressable accessibilityRole="button" onPress={onSignUpPress} testID="login-sign-up">
              <Text style={styles.linkText}>Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  linkText: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
  forgotRow: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerText: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
