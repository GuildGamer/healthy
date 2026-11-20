import { fontSize, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { FormButton, InlineNotice, InsetField, PasswordInsetField } from '@/components/forms';
import { signIn, waitForSession } from '@/lib/auth-client';
import { saveLastSignInMethod } from '@/lib/last-sign-in-method';
import { type Theme, useThemedStyles } from '@/theme';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';
import { isPlausibleEmail } from '@/lib/credentials';
import { createFieldStackStyles } from './field-stack-styles';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';
import { FieldError } from './FrontDoorText';

/** One message for both cases, so it never says which emails have accounts. */
const WRONG_DETAILS_MESSAGE =
  'That email and password don’t match. Try again or reset your password.';

type LoginFailure = 'wrong-details' | 'connection';

interface LoginEmailScreenProps {
  onBackPress: () => void;
  onForgotPasswordPress: (email: string) => void;
  onSignedIn: () => Promise<void> | void;
}

export function LoginEmailScreen({
  onBackPress,
  onForgotPasswordPress,
  onSignedIn,
}: LoginEmailScreenProps) {
  const fieldStyles = useThemedStyles(createFieldStackStyles);
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isPlausibleEmail(email) && password.length > 0;

  async function logIn() {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFailure(null);
    try {
      const { error } = await signIn.email({ email: email.trim(), password });
      if (error || !(await waitForSession())) {
        setFailure('wrong-details');
        return;
      }

      await saveLastSignInMethod('email');
      await onSignedIn();
    } catch {
      setFailure('connection');
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearFailure() {
    if (failure === 'wrong-details') {
      setFailure(null);
    }
  }

  return (
    <FrontDoorLayout
      dock={
        <FormButton
          disabled={!canSubmit}
          label={failure === 'connection' ? 'Try again' : 'Log in'}
          loading={isSubmitting}
          onPress={() => void logIn()}
          testID="login-submit"
        />
      }
      onBackPress={onBackPress}
      testID="login-email"
    >
      <FrontDoorTitle title="Log in" />
      {failure === 'connection' ? (
        <InlineNotice icon="offline" message={CONNECTION_FAILED_MESSAGE} tone="error" />
      ) : null}
      <InsetField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        containerStyle={fieldStyles.firstField}
        keyboardType="email-address"
        label="Email"
        onChangeText={(next) => {
          setEmail(next);
          clearFailure();
        }}
        placeholder="you@example.com"
        testID="login-email-field"
        textContentType="emailAddress"
        value={email}
      />
      <PasswordInsetField
        containerStyle={fieldStyles.field}
        hasError={failure === 'wrong-details'}
        onChangeText={(next) => {
          setPassword(next);
          clearFailure();
        }}
        onSubmitEditing={() => void logIn()}
        purpose="current"
        returnKeyType="go"
        testID="login-password"
        value={password}
      />
      {failure === 'wrong-details' ? (
        <FieldError testID="login-error">{WRONG_DETAILS_MESSAGE}</FieldError>
      ) : null}
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onForgotPasswordPress(email.trim())}
        style={styles.forgot}
        testID="login-forgot-password"
      >
        <Text style={styles.forgotLabel}>Forgot password?</Text>
      </Pressable>
    </FrontDoorLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    forgot: {
      alignSelf: 'flex-start',
      marginTop: spacing.md,
      marginHorizontal: spacing.xs,
    },
    forgotLabel: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
  });
