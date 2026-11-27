import { useState } from 'react';
import { Text } from 'react-native';
import { FormButton, InlineNotice, InsetField, PasswordInsetField } from '@/components/forms';
import { signUp, waitForSession } from '@/lib/auth-client';
import { saveLastSignInMethod } from '@/lib/last-sign-in-method';
import { useThemedStyles } from '@/theme';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';
import { createFieldStackStyles } from './field-stack-styles';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';
import { FieldError, FieldRule, TermsLine } from './FrontDoorText';
import { isPlausibleEmail, MINIMUM_PASSWORD_LENGTH, PASSWORD_RULE } from '@/lib/credentials';

type SignUpFailure = 'rejected' | 'connection';

interface EmailSignUpScreenProps {
  onBackPress: () => void;
  onLoginPress: () => void;
  onSignedUp: () => Promise<void> | void;
}

/**
 * Email and one password, with Show instead of typing it twice. The name
 * comes next, on Two quick things, so this page asks only for the login.
 */
export function EmailSignUpScreen({
  onBackPress,
  onLoginPress,
  onSignedUp,
}: EmailSignUpScreenProps) {
  const styles = useThemedStyles(createFieldStackStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<SignUpFailure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPasswordLongEnough = password.length >= MINIMUM_PASSWORD_LENGTH;
  const canSubmit = isPlausibleEmail(email) && isPasswordLongEnough;

  async function createAccount() {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFailure(null);
    try {
      // The public name is asked for next; the account name starts empty.
      const { error } = await signUp.email({ email: email.trim(), password, name: '' });
      if (error || !(await waitForSession())) {
        setFailure('rejected');
        return;
      }

      await saveLastSignInMethod('email');
      await onSignedUp();
    } catch {
      setFailure('connection');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FrontDoorLayout
      dock={
        <>
          <FormButton
            disabled={!canSubmit}
            label={failure === 'connection' ? 'Try again' : 'Create account'}
            loading={isSubmitting}
            onPress={() => void createAccount()}
            testID="signup-submit"
          />
          <TermsLine />
        </>
      }
      onBackPress={onBackPress}
      testID="email-sign-up"
    >
      <FrontDoorTitle subtitle="You’ll use these to log in." title="Your email" />
      {failure === 'connection' ? (
        <InlineNotice icon="offline" message={CONNECTION_FAILED_MESSAGE} tone="error" />
      ) : null}
      <InsetField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        containerStyle={styles.firstField}
        hasError={failure === 'rejected'}
        keyboardType="email-address"
        label="Email"
        onChangeText={(next) => {
          setEmail(next);
          setFailure(null);
        }}
        placeholder="you@example.com"
        testID="signup-email"
        textContentType="emailAddress"
        value={email}
      />
      {failure === 'rejected' ? (
        <FieldError testID="signup-email-error">
          We couldn’t make an account with this email. If you already have one,{' '}
          <Text accessibilityRole="link" onPress={onLoginPress} style={styles.errorLink}>
            log in instead
          </Text>
          .
        </FieldError>
      ) : null}
      <PasswordInsetField
        containerStyle={styles.field}
        onChangeText={setPassword}
        purpose="new"
        testID="signup-password"
        value={password}
      />
      <FieldRule met={isPasswordLongEnough} text={PASSWORD_RULE} />
    </FrontDoorLayout>
  );
}
