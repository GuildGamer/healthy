import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { apiClient } from '@/lib/api';
import {
  NATIVE_MOVEMENT_UNAVAILABLE,
  requestMovementAccess,
} from '@/lib/device-health';

export function ConnectHealthSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (status: 'connected' | 'denied') => {
      if (status === 'connected') {
        const result = await requestMovementAccess();
        return apiClient.updateHealthLink({ status: result });
      }

      return apiClient.updateHealthLink({ status: 'denied' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      onClose();
    },
  });

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Movement & watch</Text>
        <Text style={styles.body}>
          Allow motion and location so this phone can count steps and record
          walks. If you wear a watch, keep Apple Health or Health Connect
          connected so those workouts can appear here.
        </Text>
        <Text style={styles.body}>
          We only read workouts, steps, and the route you start in the app.
          You confirm before anything is marked done.
        </Text>
        {save.isError ? (
          <FormErrorBanner
            message={
              save.error instanceof Error &&
              save.error.message === NATIVE_MOVEMENT_UNAVAILABLE
                ? NATIVE_MOVEMENT_UNAVAILABLE
                : 'We could not save that choice. Try again.'
            }
          />
        ) : null}
        <FormButton
          label="Allow motion & location"
          loading={save.isPending}
          onPress={() => save.mutate('connected')}
          testID="connect-health"
        />
        <FormButton
          label="Not now"
          onPress={() => save.mutate('denied')}
          testID="skip-health"
          variant="secondary"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  body: {
    color: colors.muted,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
});
