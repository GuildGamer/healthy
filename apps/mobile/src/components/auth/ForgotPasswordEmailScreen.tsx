import { useState } from 'react';
import { FormButton, InlineNotice, InsetField } from '@/components/forms';
import { requestPasswordResetEmail } from '@/lib/auth-client';
import { useThemedStyles } from '@/theme';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';
import { isPlausibleEmail } from '@/lib/credentials';
import { createFieldStackStyles } from './field-stack-styles';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';
import { FieldNote } from './FrontDoorText';

interface ForgotPasswordEmailScreenProps {
  /** Carried over from Log in, so it is not typed twice. */
  initialEmail: string;
  onBackPress: () => void;
  onCodeSent: (email: string) => void;
}

/** The note is careful not to confirm that an account exists. */
export function ForgotPasswordEmailScreen({
  initialEmail,
  onBackPress,
  onCodeSent,
}: ForgotPasswordEmailScreenProps) {
  const styles = useThemedStyles(createFieldStackStyles);
  const [email, setEmail] = useState(initialEmail);
  const [hasFailed, setHasFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedEmail = email.trim();
  const canSubmit = isPlausibleEmail(trimmedEmail);

  async function sendCode() {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setHasFailed(false);
    try {
      const { error } = await requestPasswordResetEmail(trimmedEmail);
      if (error) {
        setHasFailed(true);
        return;
      }

      onCodeSent(trimmedEmail);
    } catch {
      setHasFailed(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FrontDoorLayout
      dock={
        <FormButton
          disabled={!canSubmit}
          label="Send code"
          loading={isSubmitting}
          onPress={() => void sendCode()}
          testID="forgot-send-code"
        />
      }
      onBackPress={onBackPress}
      testID="forgot-password"
    >
      <FrontDoorTitle subtitle="We’ll email you a code." title="Reset your password" />
      {hasFailed ? (
        <InlineNotice icon="offline" message={CONNECTION_FAILED_MESSAGE} tone="error" />
      ) : null}
      <InsetField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        autoFocus={!initialEmail}
        containerStyle={styles.firstField}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        onSubmitEditing={() => void sendCode()}
        placeholder="you@example.com"
        returnKeyType="send"
        testID="forgot-email"
        textContentType="emailAddress"
        value={email}
      />
      <FieldNote>If there’s an account with this email, the code arrives in a minute.</FieldNote>
    </FrontDoorLayout>
  );
}
