import { fontWeight } from '@product/brand';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { FormButton, InlineNotice, PasswordInsetField } from '@/components/forms';
import { useSession } from '@/lib/auth-client';
import { PASSWORD_RULE } from '@/lib/credentials';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { SettingsNote } from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import { usePasswordChange } from './usePasswordChange';

const leave = () => goBackOrHome('/settings/account');

/** Current password, then the new one with its rule shown before typing. */
export function ChangePasswordScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: session } = useSession();
  const password = usePasswordChange();

  if (password.isChanged) {
    return (
      <SettingsPage
        dock={<FormButton label="Done" onPress={leave} testID="change-password-done" />}
        onBack={leave}
        title="Password"
      >
        <SettingsNote centered>Your password is changed. Other phones stay signed in.</SettingsNote>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage
      dock={
        <FormButton
          disabled={!password.canSubmit}
          label="Change password"
          loading={password.isSaving}
          onPress={password.submit}
          testID="change-password-submit"
        />
      }
      onBack={leave}
      testID="change-password-screen"
      title="Password"
    >
      {password.errorMessage ? (
        <InlineNotice icon="lock" message={password.errorMessage} tone="error" />
      ) : null}
      <PasswordInsetField
        autoFocus
        containerStyle={styles.firstField}
        label="Current password"
        onChangeText={password.setCurrentPassword}
        purpose="current"
        testID="current-password"
        value={password.currentPassword}
      />
      <PasswordInsetField
        containerStyle={styles.field}
        label="New password"
        onChangeText={password.setNewPassword}
        onSubmitEditing={password.submit}
        purpose="new"
        returnKeyType="done"
        testID="new-password"
        value={password.newPassword}
      />
      <SettingsNote>{`${PASSWORD_RULE}.`}</SettingsNote>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() =>
          router.push({
            pathname: '/forgot-password',
            params: { email: session?.user.email ?? '' },
          })
        }
        testID="forgot-password"
      >
        <Text style={styles.forgot}>Forgot your password?</Text>
      </Pressable>
    </SettingsPage>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    firstField: {
      marginTop: 18,
    },
    field: {
      marginTop: 10,
    },
    forgot: {
      marginTop: 14,
      marginHorizontal: 6,
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: fontWeight.medium,
    },
  });
