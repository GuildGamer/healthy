import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { FormButton, InlineNotice, InsetField } from '@/components/forms';
import { requestEmailChange } from '@/lib/auth-client';
import { isPlausibleEmail } from '@/lib/credentials';
import { goBackOrHome } from '@/lib/go-back';
import { SETTINGS_SAVE_FAILED_MESSAGE } from './constants/settings-copy';
import { SettingsNote } from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import { useMe } from './useMe';

const INVALID_EMAIL_MESSAGE = 'That email doesn’t look right. Check it and try again.';

function emailChangeErrorMessage(message: string | undefined): string {
  return message?.toLowerCase().includes('invalid email')
    ? INVALID_EMAIL_MESSAGE
    : SETTINGS_SAVE_FAILED_MESSAGE;
}

/** A code goes to the new address first; the email only changes once it is typed. */
export function ChangeEmailScreen() {
  const router = useRouter();
  const savedEmail = useMe().data?.email ?? '';
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const trimmed = email.trim();
  const canSend =
    isPlausibleEmail(trimmed) && trimmed.toLowerCase() !== savedEmail.toLowerCase() && !isSending;

  async function sendCode() {
    if (!canSend) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    try {
      const { error } = await requestEmailChange(trimmed);
      if (error) {
        setErrorMessage(emailChangeErrorMessage(error.message));
        return;
      }

      router.push({ pathname: '/settings/change-email', params: { email: trimmed } });
    } catch {
      setErrorMessage(SETTINGS_SAVE_FAILED_MESSAGE);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <SettingsPage
      dock={
        <FormButton
          disabled={!canSend}
          label="Send code"
          loading={isSending}
          onPress={() => void sendCode()}
          testID="edit-profile-save"
        />
      }
      onBack={() => goBackOrHome('/settings/account')}
      testID="change-email-screen"
      title="Email"
    >
      {errorMessage ? <InlineNotice icon="mail" message={errorMessage} tone="error" /> : null}
      <InsetField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        autoFocus
        containerStyle={styles.field}
        keyboardType="email-address"
        label="New email"
        onChangeText={setEmail}
        onSubmitEditing={() => void sendCode()}
        placeholder={savedEmail}
        returnKeyType="send"
        testID="edit-profile-email"
        textContentType="emailAddress"
        value={email}
      />
      <SettingsNote>We’ll send a code to the new address before it changes.</SettingsNote>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 18,
  },
});
