import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { CountryCode } from '@product/contract/country-code';
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
  CountryPickerField,
  FieldMark,
  FormButton,
  FormErrorBanner,
  FormField,
  PasswordField,
  TextField,
} from '@/components/forms';
import { apiClient } from '@/lib/api';
import { signInWithGoogle, signUp, waitForSession } from '@/lib/auth-client';
import { deviceCountryCode } from '@/lib/country';
import {
  quirkyEmailPlaceholder,
  quirkyNamePlaceholder,
} from '@/lib/form-placeholders';
import { AuthScreenHeader } from './AuthScreenHeader';
import { AuthMethodDivider, GoogleAuthButton } from './SocialAuthButton';

interface SignUpScreenProps {
  onSignedUp: () => void;
  /** After Google OAuth — may still need country / categories. */
  onSocialSignedIn: () => void;
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
const GOOGLE_FAILED_MESSAGE =
  'We could not continue with Google. Agree to the terms, then try again.';
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

export function SignUpScreen({
  onSignedUp,
  onSocialSignedIn,
  onLoginPress,
  onBackPress,
}: SignUpScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode | null>(() =>
    deviceCountryCode(),
  );
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [googleExpanded, setGoogleExpanded] = useState(true);
  const [namePlaceholder] = useState(quirkyNamePlaceholder);
  const [emailPlaceholder] = useState(quirkyEmailPlaceholder);

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const busy = isSubmitting || isGoogleSubmitting;

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= MINIMUM_PASSWORD_LENGTH &&
    password === confirmPassword &&
    countryCode !== null &&
    agreedToTerms;

  function foldGoogleForEmailForm() {
    if (googleExpanded) {
      setGoogleExpanded(false);
    }
  }

  function handleNameChange(value: string) {
    if (value.length > 0) {
      foldGoogleForEmailForm();
    }
    setFullName(value);
  }

  async function handleSubmit() {
    if (!canSubmit || !countryCode || busy) return;

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

      await apiClient.updateCountry({ countryCode });
      onSignedUp();
    } catch {
      setErrorMessage(NETWORK_FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (!agreedToTerms || busy) {
      setErrorMessage('Agree to the Terms & Conditions before continuing with Google.');
      return;
    }

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

      onSocialSignedIn();
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
            subtitle="Join Healthy and start earning points"
            title="Create Account"
          />

          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

          {googleExpanded ? (
            <View style={styles.googleBlock}>
              <TermsCheckbox
                checked={agreedToTerms}
                onToggle={() => setAgreedToTerms((value) => !value)}
              />

              <GoogleAuthButton
                disabled={busy || !agreedToTerms}
                loading={isGoogleSubmitting}
                onPress={handleGoogle}
                testID="signup-google"
              />

              <AuthMethodDivider />
            </View>
          ) : (
            <Pressable
              accessibilityHint="Expands the Google sign-up option"
              accessibilityLabel="Sign up with Google instead"
              accessibilityRole="button"
              onPress={() => setGoogleExpanded(true)}
              style={({ pressed }) => [
                styles.googleFold,
                pressed ? styles.googleFoldPressed : null,
              ]}
              testID="signup-google-expand"
            >
              <MaterialCommunityIcons color={colors.muted} name="google" size={16} />
              <Text style={styles.googleFoldLabel}>Sign up with Google instead</Text>
              <Feather color={colors.muted} name="chevron-down" size={16} />
            </Pressable>
          )}

          <FormField label="Full Name" required>
            <TextField
              autoComplete="name"
              leading={<FieldMark role="name" />}
              onChangeText={handleNameChange}
              onFocus={foldGoogleForEmailForm}
              placeholder={namePlaceholder}
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
              leading={<FieldMark role="email" />}
              onChangeText={setEmail}
              onFocus={foldGoogleForEmailForm}
              placeholder={emailPlaceholder}
              testID="signup-email"
              value={email}
            />
          </FormField>

          <FormField label="Password" required>
            <PasswordField
              autoComplete="new-password"
              onChangeText={setPassword}
              onFocus={foldGoogleForEmailForm}
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
              onFocus={foldGoogleForEmailForm}
              placeholder="Confirm your password"
              testID="signup-confirm-password"
              value={confirmPassword}
            />
          </FormField>

          <FormField label="Country / region" required>
            <CountryPickerField onChange={setCountryCode} value={countryCode} />
          </FormField>

          {!googleExpanded ? (
            <TermsCheckbox
              checked={agreedToTerms}
              onToggle={() => setAgreedToTerms((value) => !value)}
            />
          ) : null}

          <FormButton
            disabled={!canSubmit || busy}
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
  googleBlock: {
    gap: spacing.md,
  },
  googleFold: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  googleFoldPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  googleFoldLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
