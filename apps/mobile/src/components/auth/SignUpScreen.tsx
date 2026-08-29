import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, radii, spacing } from '@product/brand';
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
import { signUp, waitForSession } from '@/lib/auth-client';
import { AuthScreenHeader } from './AuthScreenHeader';

interface SignUpScreenProps {
  onSignedUp: () => void;
  onLoginPress: () => void;
  onBackPress: () => void;
}

interface TermsCheckboxProps {
  checked: boolean;
  onToggle: () => void;
}

const MINIMUM_PASSWORD_LENGTH = 8;
const SIGN_UP_FAILED_MESSAGE =
  'We could not create your account. That email may already be registered.';
const NETWORK_FAILED_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

function TermsCheckbox({ checked, onToggle }: TermsCheckboxProps) {
  return (
    <Pressable
      accessibilityLabel="I agree to the Terms and Conditions and Privacy Policy"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.termsRow}
      testID="signup-terms"
    >
      <View style={[styles.checkbox, checked ? styles.checkboxChecked : styles.checkboxUnchecked]}>
        {checked ? <Feather color={colors.onAccent} name="check" size={12} /> : null}
      </View>

      <Text style={styles.termsText}>
        I agree to the <Text style={styles.termsHighlight}>Terms &amp; Conditions</Text> and{' '}
        <Text style={styles.termsHighlight}>Privacy Policy</Text>
      </Text>
    </Pressable>
  );
}

export function SignUpScreen({ onSignedUp, onLoginPress, onBackPress }: SignUpScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= MINIMUM_PASSWORD_LENGTH &&
    password === confirmPassword &&
    agreedToTerms;

  async function handleSubmit() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signUp.email({
        email: email.trim(),
        password,
        name: fullName.trim(),
      });

      if (error) {
        setErrorMessage(SIGN_UP_FAILED_MESSAGE);
        return;
      }

      const hasSession = await waitForSession();
      if (!hasSession) {
        setErrorMessage(SIGN_UP_FAILED_MESSAGE);
        return;
      }

      onSignedUp();
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
            subtitle="Join Healthy and start earning points"
            title="Create Account"
          />

          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

          <FormField label="Full Name" required>
            <TextField
              autoComplete="name"
              leadingIcon="user"
              onChangeText={setFullName}
              placeholder="Enter your full name"
              testID="signup-name"
              value={fullName}
            />
          </FormField>

          <FormField label="Email" required>
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              leadingIcon="mail"
              onChangeText={setEmail}
              placeholder="your@email.com"
              testID="signup-email"
              value={email}
            />
          </FormField>

          <FormField label="Password" required>
            <PasswordField
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder="Create a password"
              requirements={[
                {
                  text: `At least ${MINIMUM_PASSWORD_LENGTH} characters`,
                  valid: password.length >= MINIMUM_PASSWORD_LENGTH,
                },
              ]}
              testID="signup-password"
              value={password}
            />
          </FormField>

          <FormField
            error={passwordsMismatch ? 'Passwords do not match' : undefined}
            label="Confirm Password"
            required
          >
            <PasswordField
              autoComplete="new-password"
              hasError={passwordsMismatch}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              testID="signup-confirm-password"
              value={confirmPassword}
            />
          </FormField>

          <TermsCheckbox
            checked={agreedToTerms}
            onToggle={() => setAgreedToTerms((agreed) => !agreed)}
          />

          <FormButton
            disabled={!canSubmit}
            label="Create Account"
            loading={isSubmitting}
            onPress={handleSubmit}
            testID="signup-submit"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable accessibilityRole="button" onPress={onLoginPress} testID="signup-login">
              <Text style={styles.linkText}>Log In</Text>
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
  },
  checkboxUnchecked: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  termsText: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  termsHighlight: {
    color: colors.accent,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  footerText: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  linkText: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
});
