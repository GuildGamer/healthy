import { spacing } from '@product/brand';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DeckButton, DeckSheetModal, DeckSheetSub } from '@/components/deck';
import { InlineNotice, InsetField } from '@/components/forms';
import { updateUser } from '@/lib/auth-client';
import { SETTINGS_SAVE_FAILED_MESSAGE } from './constants/settings-copy';
import { ME_QUERY_KEY } from './useMe';

/** Rarely changed and never shown to anyone, so it edits in a sheet rather than on the page. */
export function FullNameSheet({
  visible,
  savedName,
  onClose,
}: {
  visible: boolean;
  savedName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(savedName);
  const trimmed = draft.trim();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await updateUser({ name: trimmed });
      if (error) {
        throw new Error(SETTINGS_SAVE_FAILED_MESSAGE);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      onClose();
    },
  });

  return (
    <DeckSheetModal
      footer={
        <View style={styles.action}>
          <DeckButton
            disabled={trimmed.length === 0 || trimmed === savedName.trim()}
            label="Save"
            loading={save.isPending}
            onPress={() => save.mutate()}
            testID="full-name-save"
          />
        </View>
      }
      onDismiss={save.isPending ? undefined : onClose}
      testID="full-name-sheet"
      title="Account name"
      visible={visible}
    >
      <DeckSheetSub>Contests show your first name to friends. The rest stays private.</DeckSheetSub>
      {save.isError ? (
        <InlineNotice icon="offline" message={SETTINGS_SAVE_FAILED_MESSAGE} tone="error" />
      ) : null}
      <InsetField
        autoCapitalize="words"
        autoComplete="name"
        autoFocus
        containerStyle={styles.field}
        label="Full name"
        onChangeText={setDraft}
        onSubmitEditing={() => save.mutate()}
        returnKeyType="done"
        testID="edit-profile-name"
        textContentType="name"
        value={draft}
      />
    </DeckSheetModal>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: spacing.md,
  },
  action: {
    marginTop: spacing.md,
  },
});
