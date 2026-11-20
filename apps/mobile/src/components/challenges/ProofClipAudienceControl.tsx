import type { ProofClipAudience } from '@product/client';
import { fontSize, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckSegmented } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { POSE_COPY } from './constants/doing-copy';

const OPTIONS = [
  { id: 'anyone' as const, label: POSE_COPY.audienceAnyone },
  { id: 'only_me' as const, label: POSE_COPY.audienceOnlyMe },
];

type ProofClipAudienceControlProps = {
  value: ProofClipAudience;
  onChange: (audience: ProofClipAudience) => void;
  /** Shown after narrowing an uploaded clip. */
  showNarrowedHint?: boolean;
  disabled?: boolean;
  testID?: string;
};

/** Named two-way choice so flipping one set to private is one obvious tap. */
export function ProofClipAudienceControl({
  value,
  onChange,
  showNarrowedHint = false,
  disabled = false,
  testID = 'proof-audience-control',
}: ProofClipAudienceControlProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap}>
      <DeckSegmented
        disabled={disabled}
        onSelect={onChange}
        options={OPTIONS}
        selected={value}
        testID={testID}
      />
      {showNarrowedHint && value === 'only_me' ? (
        <Text style={styles.hint} testID={`${testID}-narrowed-hint`}>
          {POSE_COPY.audienceNarrowedHint}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    hint: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
  });
