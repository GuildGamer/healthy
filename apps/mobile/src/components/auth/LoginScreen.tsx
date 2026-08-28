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
  PasswordField,
  TextField,
} from '@/components/forms';
import { signIn } from '@/lib/auth-client';
import { AuthScreenHeader } from './AuthScreenHeader';

interface LoginScreenProps {
  onAuthenticated: () => void;
  onSignUpPress: () => void;
  onBackPress: () => void;
}

const SIGN_IN_FAILED_MESSAGE = 'We could not log you in. Check your details and try again.';
const NETWORK_FAILED_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

export function LoginScreen({ onAuthenticated, onSignUpPress, onBackPress }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signIn.email({ email: email.trim(), password });

      if (error) {
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

          <FormField label="Email" required>
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              leadingIcon="mail"
              onChangeText={setEmail}
              placeholder="your@email.com"
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

          <FormButton
            disabled={!canSubmit}
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
