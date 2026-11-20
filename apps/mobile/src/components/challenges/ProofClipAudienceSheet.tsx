import type { ProofClipAudience } from '@product/client';
import { fontSize, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckSelectRow,
  DeckSheetModal,
  DeckSheetSub,
} from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { POSE_COPY } from './constants/doing-copy';

type ProofClipAudienceSheetProps = {
  visible: boolean;
  selected: ProofClipAudience;
  onSelect: (audience: ProofClipAudience) => void;
  onDone: () => void;
  onDismiss?: () => void;
};

/** One-time (or per-set) choice of who may watch proof clips by their code. */
export function ProofClipAudienceSheet({
  visible,
  selected,
  onSelect,
  onDone,
  onDismiss,
}: ProofClipAudienceSheetProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <DeckSheetModal
      footer={
        <DeckButton label={POSE_COPY.audienceDone} onPress={onDone} testID="proof-audience-done" />
      }
      onDismiss={onDismiss}
      testID="proof-audience-sheet"
      title={POSE_COPY.audienceSheetTitle}
      visible={visible}
    >
      <DeckSheetSub>{POSE_COPY.audienceSheetBody}</DeckSheetSub>
      <View style={styles.choices}>
        <DeckSelectRow
          isFirst
          isSelected={selected === 'anyone'}
          onPress={() => onSelect('anyone')}
          testID="proof-audience-anyone"
          title={POSE_COPY.audienceAnyone}
        />
        <DeckSelectRow
          isSelected={selected === 'only_me'}
          meta={POSE_COPY.audienceOnlyMeSub}
          onPress={() => onSelect('only_me')}
          testID="proof-audience-only-me"
          title={POSE_COPY.audienceOnlyMe}
        />
      </View>
      <Text style={styles.hint}>You can still change any single clip.</Text>
    </DeckSheetModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    choices: {
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    hint: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      marginTop: spacing.md,
    },
  });
