import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { type Theme, useThemedStyles } from '@/theme';
import { useHealthLink } from './useHealthLink';

export function ConnectHealthSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const healthLink = useHealthLink({ onSaved: onClose });

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Movement & sleep</Text>
        <Text style={styles.body}>
          Allow motion, location, and sleep so this phone can count steps, record walks, and offer
          last night’s sleep from Apple Health or Health Connect. If you wear a watch, keep that
          store connected so workouts and sleep can appear here.
        </Text>
        <Text style={styles.body}>
          We only read workouts, steps, sleep, and the route you start in the app. You confirm
          before anything is marked done. Healthy never writes to the health store.
        </Text>
        {healthLink.errorMessage ? <FormErrorBanner message={healthLink.errorMessage} /> : null}
        <FormButton
          label="Allow access"
          loading={healthLink.isSaving}
          onPress={healthLink.allow}
          testID="connect-health"
        />
        <FormButton
          label="Not now"
          onPress={healthLink.decline}
          testID="skip-health"
          variant="secondary"
        />
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
    },
    body: {
      color: theme.colors.muted,
      fontSize: fontSize.md,
      lineHeight: 24,
    },
  });
