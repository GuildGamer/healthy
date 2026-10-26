import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckSheetModal } from '@/components/deck';
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
    <DeckSheetModal
      footer={
        <View style={styles.actions}>
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
      }
      onDismiss={healthLink.isSaving ? undefined : onClose}
      testID="connect-health-sheet"
      visible={visible}
    >
      <View style={styles.content}>
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
      </View>
    </DeckSheetModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.md,
    },
    actions: {
      gap: spacing.md,
      marginTop: spacing.md,
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
