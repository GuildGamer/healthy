import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
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
  FormButton,
  FormErrorBanner,
  FormField,
  TextField,
} from '@/components/forms';
import { apiClient } from '@/lib/api';
import { updateUser, useSession } from '@/lib/auth-client';

const SAVE_FAILED_MESSAGE = 'We could not save your name. Try again.';
const NETWORK_FAILED_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

export function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const savedName = meQuery.data?.name ?? session?.user.name ?? '';
  const email = meQuery.data?.email ?? session?.user.email ?? '';
  const [draftName, setDraftName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [didSave, setDidSave] = useState(false);

  const nameValue = draftName ?? savedName;
  const canSave =
    nameValue.trim().length > 0 && nameValue.trim() !== savedName.trim();

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
    mutationFn: async (name: string) => {
      const { error } = await updateUser({ name });

      if (error) {
        throw new Error(SAVE_FAILED_MESSAGE);
      }
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setDidSave(true);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
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
          <View style={styles.avatar}>
            <Feather color={colors.accent} name="user" size={32} />
          </View>
        </View>

        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

        <Text style={styles.sectionLabel}>Details</Text>

        <FormField label="Full Name" required>
          <TextField
            autoComplete="name"
            leadingIcon="user"
            onChangeText={setDraftName}
            placeholder="Enter your full name"
            testID="edit-profile-name"
            value={nameValue}
          />
        </FormField>

        <FormField
          hint="Used to log in. Changing it will come with email verification."
          label="Email"
        >
          <TextField
            editable={false}
            leadingIcon="mail"
            testID="edit-profile-email"
            value={email}
          />
        </FormField>

        <FormButton
          disabled={!canSave}
          label="Save"
          loading={save.isPending}
          onPress={() => save.mutate(nameValue.trim())}
          testID="edit-profile-save"
        />
      </ScrollView>
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
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
