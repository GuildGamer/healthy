import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, radii, spacing } from '@product/brand';
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
  TextField,
} from '@/components/forms';
import { apiClient } from '@/lib/api';
import { updateUser } from '@/lib/auth-client';
import { deviceCountryCode } from '@/lib/country';
import { quirkyNamePlaceholder } from '@/lib/form-placeholders';
import { AuthScreenHeader } from './AuthScreenHeader';

type CompleteCountryScreenProps = {
  /** When Google (or another provider) did not supply a usable name. */
  needsName: boolean;
  onBackPress: () => void;
  onCompleted: () => void;
};

const SAVE_FAILED_MESSAGE =
  'We could not save your details. Check your connection and try again.';

function TermsCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="I agree to the Terms and Conditions and Privacy Policy"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.termsRow}
      testID="complete-country-terms"
    >
      <View
        style={[
          styles.checkbox,
          checked ? styles.checkboxChecked : styles.checkboxUnchecked,
        ]}
      >
        {checked ? (
          <Feather color={colors.onAccent} name="check" size={12} />
        ) : null}
      </View>

      <Text style={styles.termsText}>
        I agree to the <Text style={styles.termsHighlight}>Terms &amp; Conditions</Text>{' '}
        and <Text style={styles.termsHighlight}>Privacy Policy</Text>
      </Text>
    </Pressable>
  );
}

/**
 * Fills gaps Google does not provide (country, optional name, terms).
 * Email/password signup already collected these before this screen.
 */
export function CompleteCountryScreen({
  needsName,
  onBackPress,
  onCompleted,
}: CompleteCountryScreenProps) {
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode | null>(() =>
    deviceCountryCode(),
  );
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [namePlaceholder] = useState(quirkyNamePlaceholder);

  const canSubmit =
    countryCode !== null &&
    agreedToTerms &&
    (!needsName || fullName.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit || !countryCode) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (needsName) {
        const { error } = await updateUser({ name: fullName.trim() });
        if (error) {
          setErrorMessage(SAVE_FAILED_MESSAGE);
          return;
        }
      }

      await apiClient.updateCountry({ countryCode });
      onCompleted();
    } catch {
      setErrorMessage(SAVE_FAILED_MESSAGE);
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
            subtitle="A couple of details so we can tailor your challenges."
            title="Almost there"
          />

          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

          {needsName ? (
            <FormField label="Full Name" required>
              <TextField
                autoComplete="name"
                leading={<FieldMark role="name" />}
                onChangeText={setFullName}
                placeholder={namePlaceholder}
                testID="complete-country-name"
                value={fullName}
              />
            </FormField>
          ) : null}

          <FormField label="Country / region" required>
            <CountryPickerField
              onChange={setCountryCode}
              testID="complete-country-picker"
              value={countryCode}
            />
          </FormField>

          <TermsCheckbox
            checked={agreedToTerms}
            onToggle={() => setAgreedToTerms((value) => !value)}
          />

          <FormButton
            disabled={!canSubmit}
            label="Continue"
            loading={isSubmitting}
            onPress={handleSubmit}
            testID="complete-country-continue"
            trailingIcon="chevron-right"
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
  },
  checkboxUnchecked: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  termsText: {
    flex: 1,
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  termsHighlight: {
    color: colors.accent,
  },
});
