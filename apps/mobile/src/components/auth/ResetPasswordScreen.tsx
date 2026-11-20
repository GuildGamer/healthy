import { fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FormButton, OtpInput, PasswordInsetField } from '@/components/forms';
import {
  requestPasswordResetEmail,
  resetPasswordWithOtp,
  signIn,
  waitForSession,
} from '@/lib/auth-client';
import { saveLastSignInMethod } from '@/lib/last-sign-in-method';
import { type Theme, useThemedStyles } from '@/theme';
import { MINIMUM_PASSWORD_LENGTH, PASSWORD_RULE } from '@/lib/credentials';
import { useEmailCode } from './email-code';
import { EmailCodeStatus } from './EmailCodeStatus';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';
import { FieldRule } from './FrontDoorText';

interface ResetPasswordScreenProps {
  email: string;
  onBackPress: () => void;
  /** Called once signed in with the new password: no success page, no second log in. */
  onSignedIn: () => Promise<void> | void;
}

export function ResetPasswordScreen({ email, onBackPress, onSignedIn }: ResetPasswordScreenProps) {
  const styles = useThemedStyles(createStyles);
  const emailCode = useEmailCode(() => requestPasswordResetEmail(email));
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isPasswordLongEnough = password.length >= MINIMUM_PASSWORD_LENGTH;
  const canSave = emailCode.isComplete && isPasswordLongEnough;

  async function saveAndSignIn() {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const reset = await resetPasswordWithOtp({ email, otp: emailCode.code, password });
      if (reset.error) {
        emailCode.reject(reset.error);
        return;
      }

      const signedIn = await signIn.email({ email, password });
      if (signedIn.error || !(await waitForSession())) {
        emailCode.failConnection();
        return;
      }

      await saveLastSignInMethod('email');
      await onSignedIn();
    } catch {
      emailCode.failConnection();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FrontDoorLayout
      dock={
        emailCode.failure === 'expired' ? (
          <FormButton
            label="Send a new code"
            loading={emailCode.isResending}
            onPress={() => void emailCode.resend()}
            testID="reset-password-new-code"
          />
        ) : (
          <FormButton
            disabled={!canSave}
            label="Save and sign in"
            loading={isSaving}
            onPress={() => void saveAndSignIn()}
            testID="reset-password-submit"
          />
        )
      }
      onBackPress={onBackPress}
      testID="reset-password"
    >
      <FrontDoorTitle
        subtitle={
          <>
            Enter the code we sent to <Text style={styles.email}>{email}</Text>, then choose a new
            password.
          </>
        }
        title="Set a new password"
      />
      <View style={styles.code}>
        <OtpInput
          onChange={emailCode.changeCode}
          testID="reset-password-otp"
          tone={emailCode.tone}
          value={emailCode.code}
        />
      </View>
      <EmailCodeStatus emailCode={emailCode} />
      <PasswordInsetField
        containerStyle={styles.password}
        label="New password"
        onChangeText={setPassword}
        purpose="new"
        testID="reset-password-new"
        value={password}
      />
      <FieldRule met={isPasswordLongEnough} text={PASSWORD_RULE} />
    </FrontDoorLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    email: {
      color: theme.colors.text,
      fontWeight: fontWeight.semibold,
    },
    code: {
      marginTop: spacing.lg,
    },
    password: {
      marginTop: spacing.md,
    },
  });
