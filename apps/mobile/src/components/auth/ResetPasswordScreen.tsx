import { colors, spacing } from '@product/brand';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FormButton,
  FormErrorBanner,
  FormField,
  PasswordField,
} from '@/components/forms';
import { resetPasswordWithOtp } from '@/lib/auth-client';
import { AuthScreenHeader } from './AuthScreenHeader';

const MINIMUM_PASSWORD_LENGTH = 8;
const RESET_FAILED_MESSAGE =
  'We could not reset that password. Request a new code and try again.';
const NETWORK_FAILED_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

type ResetPasswordScreenProps = {
  email: string;
  otp: string;
  onBackPress: () => void;
  onResetComplete: () => void;
};

export function ResetPasswordScreen({
  email,
  otp,
  onBackPress,
  onResetComplete,
}: ResetPasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requirements = [
    {
      text: `At least ${MINIMUM_PASSWORD_LENGTH} characters`,
      valid: newPassword.length >= MINIMUM_PASSWORD_LENGTH,
    },
    {
      text: 'One uppercase letter',
      valid: /[A-Z]/.test(newPassword),
    },
    {
      text: 'One lowercase letter',
      valid: /[a-z]/.test(newPassword),
    },
    {
      text: 'One number',
      valid: /[0-9]/.test(newPassword),
    },
  ];

  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    requirements.every((requirement) => requirement.valid) &&
    newPassword === confirmPassword &&
    otp.length === 6;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await resetPasswordWithOtp({
        email,
        otp,
        password: newPassword,
      });

      if (error) {
        setErrorMessage(RESET_FAILED_MESSAGE);
        return;
      }

      onResetComplete();
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
            subtitle="Your new password must be different from previously used passwords."
            title="Create New Password"
          />

          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

          <FormField label="New Password" required>
            <PasswordField
              autoComplete="new-password"
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              requirements={requirements}
              testID="reset-password"
              value={newPassword}
            />
          </FormField>

          <FormField
            error={passwordsMismatch ? 'Passwords do not match' : undefined}
            label="Confirm New Password"
            required
          >
            <PasswordField
              autoComplete="new-password"
              hasError={passwordsMismatch}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              testID="reset-password-confirm"
              value={confirmPassword}
            />
          </FormField>

          <FormButton
            disabled={!canSubmit}
            label="Reset Password"
            loading={isSubmitting}
            onPress={handleSubmit}
            testID="reset-password-submit"
          />
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
});
