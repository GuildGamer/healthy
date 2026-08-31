import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import type { CountryCode } from '@product/contract/country-code';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CountryPickerField,
  FieldMark,
  FormButton,
  FormErrorBanner,
  FormField,
  TextField,
} from '@/components/forms';
import { apiClient } from '@/lib/api';
import { requestEmailChange, updateUser, useSession } from '@/lib/auth-client';
import { ChangePhotoSheet } from './ChangePhotoSheet';
import { ProfileAvatar, avatarNameFor } from './ProfileAvatar';
import { useUpdateProfilePhoto } from './useUpdateProfilePhoto';

const SAVE_FAILED_MESSAGE = 'We could not save your details. Try again.';
const EMAIL_SEND_FAILED_MESSAGE =
  'We could not send a code to that email. Try again.';
const INVALID_EMAIL_MESSAGE = 'Enter a valid email address.';
const NETWORK_FAILED_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

function looksLikeEmail(value: string): boolean {
  return value.includes('@');
}

function emailChangeErrorMessage(message: string | undefined): string {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('invalid email')) {
    return INVALID_EMAIL_MESSAGE;
  }

  return EMAIL_SEND_FAILED_MESSAGE;
}

export function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const savedName = meQuery.data?.name ?? session?.user.name ?? '';
  const savedEmail = meQuery.data?.email ?? session?.user.email ?? '';
  const savedCountry = meQuery.data?.countryCode ?? null;
  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState<string | null>(null);
  const [draftCountry, setDraftCountry] = useState<CountryCode | null | undefined>(
    undefined,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [didSave, setDidSave] = useState(false);
  const photo = useUpdateProfilePhoto();

  const nameValue = draftName ?? savedName;
  const emailValue = draftEmail ?? savedEmail;
  const countryValue =
    draftCountry === undefined ? savedCountry : draftCountry;
  const trimmedName = nameValue.trim();
  const trimmedEmail = emailValue.trim();
  const nameChanged = trimmedName.length > 0 && trimmedName !== savedName.trim();
  const emailChanged =
    trimmedEmail.length > 0 &&
    trimmedEmail.toLowerCase() !== savedEmail.trim().toLowerCase();
  const countryChanged =
    countryValue !== null && countryValue !== savedCountry;
  const canSave = nameChanged || emailChanged || countryChanged;

  useEffect(() => {
    if (!didSave) {
      return;
    }

    const timer = setTimeout(() => {
      router.back();
    }, 1200);

    return () => clearTimeout(timer);
  }, [didSave, router]);

  const save = useMutation({
    mutationFn: async () => {
      if (emailChanged && !looksLikeEmail(trimmedEmail)) {
        throw new Error(INVALID_EMAIL_MESSAGE);
      }

      if (nameChanged) {
        const { error } = await updateUser({ name: trimmedName });
        if (error) {
          throw new Error(SAVE_FAILED_MESSAGE);
        }
      }

      if (countryChanged && countryValue) {
        await apiClient.updateCountry({ countryCode: countryValue });
      }

      if (!emailChanged) {
        return 'profile' as const;
      }

      const { error } = await requestEmailChange(trimmedEmail);
      if (error) {
        throw new Error(emailChangeErrorMessage(error.message));
      }

      return 'email' as const;
    },
    onSuccess: async (changed) => {
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['me'] });

      if (changed === 'email') {
        router.push({
          pathname: '/change-email',
          params: { email: trimmedEmail },
        });
        return;
      }

      setDidSave(true);
    },
    onError: (error: unknown) => {
      setErrorMessage(
        error instanceof Error ? error.message : NETWORK_FAILED_MESSAGE,
      );
    },
  });

  if (didSave) {
    return (
      <View style={styles.saved} testID="edit-profile-saved">
        <View style={styles.savedIcon}>
          <Feather color={colors.accent} name="check-circle" size={48} />
        </View>
        <Text style={styles.savedTitle}>Profile Updated</Text>
        <Text style={styles.savedBody}>Your details have been saved.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        testID="edit-profile-screen"
      >
        <View style={styles.avatarBlock}>
          <ProfileAvatar
            imageUri={session?.user.image}
            name={avatarNameFor({
              displayName: meQuery.data?.displayName,
              name: savedName,
            })}
            onEditPress={photo.openSheet}
            testID="edit-profile-avatar"
          />
        </View>

        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

        <Text style={styles.sectionLabel}>Details</Text>

        <FormField label="Full Name" required>
          <TextField
            autoComplete="name"
            leading={<FieldMark role="name" />}
            onChangeText={setDraftName}
            placeholder="Enter your full name"
            testID="edit-profile-name"
            value={nameValue}
          />
        </FormField>

        <FormField
          hint="We'll send a code to the new address before it changes."
          label="Email"
          required
        >
          <TextField
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            leading={<FieldMark role="email" />}
            onChangeText={setDraftEmail}
            placeholder="your@email.com"
            testID="edit-profile-email"
            value={emailValue}
          />
        </FormField>

        <FormField label="Country / region" required>
          <CountryPickerField
            onChange={setDraftCountry}
            testID="edit-profile-country"
            value={countryValue}
          />
        </FormField>

        <FormButton
          disabled={!canSave}
          label="Save"
          loading={save.isPending}
          onPress={() => save.mutate()}
          testID="edit-profile-save"
        />
      </ScrollView>
      <ChangePhotoSheet
        errorMessage={photo.errorMessage}
        isSaving={photo.isSaving}
        onClose={photo.closeSheet}
        onPick={photo.pickFrom}
        visible={photo.sheetOpen}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  avatarBlock: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  saved: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  savedIcon: {
    marginBottom: spacing.sm,
  },
  savedTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  savedBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
