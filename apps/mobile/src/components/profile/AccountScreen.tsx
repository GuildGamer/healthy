import type { CountryCode } from '@product/contract/country-code';
import { fontWeight, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CountrySheet, FormButton, InlineNotice } from '@/components/forms';
import { apiClient } from '@/lib/api';
import { hasPasswordSignIn, signOut, useSession } from '@/lib/auth-client';
import { countryName } from '@/lib/country';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { SETTINGS_SAVE_FAILED_MESSAGE, SIGN_OUT_CONFIRM_BODY } from './constants/settings-copy';
import { SettingsActionSheet, SettingsGroup, SettingsLinkRow } from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import { ME_QUERY_KEY, useMe } from './useMe';

/** Sign-in details, then Sign out, then Delete account. */
export function AccountScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: session } = useSession();
  const me = useMe().data;
  const email = me?.email ?? session?.user.email ?? '';
  const hasPassword = useQuery({
    queryKey: ['auth', 'has-password'],
    queryFn: hasPasswordSignIn,
  }).data;
  const country = useCountryChange();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  return (
    <SettingsPage
      onBack={() => goBackOrHome('/settings')}
      testID="account-settings"
      title="Account"
    >
      {country.hasFailed ? (
        <InlineNotice icon="offline" message={SETTINGS_SAVE_FAILED_MESSAGE} tone="error" />
      ) : null}
      <SettingsGroup>
        <SettingsLinkRow
          label="Email"
          onPress={() => router.push('/settings/email')}
          testID="open-change-email"
          value={email}
        />
        {hasPassword ? (
          <SettingsLinkRow
            label="Password"
            onPress={() => router.push('/settings/password')}
            testID="open-change-password"
            value="Change"
          />
        ) : null}
        <SettingsLinkRow
          label="Country"
          meta="Sets your prices and payment options"
          onPress={country.open}
          testID="edit-profile-country"
          value={me?.countryCode ? countryName(me.countryCode) : 'Choose'}
        />
      </SettingsGroup>

      <View style={styles.signOut}>
        <FormButton
          label="Sign out"
          onPress={() => setIsSignOutOpen(true)}
          testID="profile-sign-out"
          variant="outline"
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings/delete-account')}
          style={({ pressed }) => [styles.deleteAccount, pressed ? styles.pressed : null]}
          testID="open-delete-account"
        >
          <Text style={styles.deleteAccountLabel}>Delete account</Text>
        </Pressable>
      </View>

      <CountrySheet
        onClose={country.close}
        onSelect={country.save}
        title="Country / region"
        value={me?.countryCode ?? null}
        visible={country.isOpen}
      />
      <SettingsActionSheet
        actions={[
          {
            label: 'Sign out',
            isDestructive: true,
            onPress: () => {
              setIsSignOutOpen(false);
              void signOut();
            },
            testID: 'confirm-sign-out',
          },
        ]}
        body={SIGN_OUT_CONFIRM_BODY}
        onCancel={() => setIsSignOutOpen(false)}
        testID="sign-out-sheet"
        title="Sign out of Healthy?"
        visible={isSignOutOpen}
      />
    </SettingsPage>
  );
}

/** The country decides prices, so the membership offer is fetched again after it changes. */
function useCountryChange() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (countryCode: CountryCode) => apiClient.updateCountry({ countryCode }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['membership-offer'] }),
      ]),
  });

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    save: (countryCode: CountryCode) => {
      setIsOpen(false);
      mutation.mutate(countryCode);
    },
    hasFailed: mutation.isError,
  };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    signOut: {
      marginTop: 28,
      gap: spacing.xs,
    },
    deleteAccount: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.7,
    },
    deleteAccountLabel: {
      color: theme.colors.danger,
      fontSize: 15.5,
      fontWeight: fontWeight.medium,
    },
  });
