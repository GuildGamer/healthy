import { colors, fontSize, spacing } from '@product/brand';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FormButton,
  FormErrorBanner,
  FormField,
  TextField,
} from '@/components/forms';
import { requestPasswordResetEmail } from '@/lib/auth-client';
import { AuthScreenHeader } from './AuthScreenHeader';

const NETWORK_FAILED_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

type ForgotPasswordEmailScreenProps = {
  onBackPress: () => void;
  onCodeSent: (email: string) => void;
};

export function ForgotPasswordEmailScreen({
  onBackPress,
  onCodeSent,
}: ForgotPasswordEmailScreenProps) {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedEmail = email.trim();
  const canSubmit = trimmedEmail.includes('@');

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await requestPasswordResetEmail(trimmedEmail);

      if (error) {
        setErrorMessage(NETWORK_FAILED_MESSAGE);
        return;
      }

      onCodeSent(trimmedEmail);
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <AuthScreenHeader
            onBackPress={onBackPress}
            subtitle="Enter the email on your account and we will send a code to reset your password."
            title="Forgot Password?"
          />

          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

          <FormField
            hint="We'll send a 6-digit verification code to this address"
            label="Email"
            required
          >
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              leadingIcon="mail"
              onChangeText={setEmail}
              placeholder="your@email.com"
              testID="forgot-email"
              value={email}
            />
          </FormField>

          <FormButton
            disabled={!canSubmit}
            label="Send Code"
            loading={isSubmitting}
            onPress={handleSubmit}
            testID="forgot-send-code"
          />

          <Text style={styles.caption}>
            Use the email you signed up with.
          </Text>
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
  caption: {
    color: colors.muted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
