import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DECK_CARD_RADIUS, DeckButton } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GROUPS_COPY } from './match-copy';

/**
 * The Groups segment's front door: the loop in three steps and one button.
 * Nothing here names a condition, so the page never hints at why anyone is here.
 */
export function GroupsEmptyCard({ onStart }: { onStart: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card} testID="matches-empty">
      <Glyph color={colors.muted} name="users" size={26} strokeWidth={2} />
      <Text accessibilityRole="header" style={styles.title}>
        {GROUPS_COPY.emptyTitle}
      </Text>
      <Text style={styles.body}>{GROUPS_COPY.emptyBody}</Text>
      <View style={styles.steps}>
        {GROUPS_COPY.emptySteps.map((step, index) => (
          <View key={step.title} style={[styles.step, index === 0 ? null : styles.stepDivided]}>
            <Text style={styles.stepIndex}>{index + 1}</Text>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepHint}>{step.hint}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.action}>
        <DeckButton
          label={GROUPS_COPY.startGroup}
          onPress={onStart}
          testID="matches-empty-create"
        />
      </View>
    </View>
  );
}

const STEP_INDEX_SIZE = 24;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginTop: spacing.lg,
      borderRadius: DECK_CARD_RADIUS,
      padding: spacing.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
      lineHeight: 30,
      marginTop: 14,
    },
    body: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      marginTop: 6,
    },
    steps: {
      marginTop: 18,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 10,
    },
    stepDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    stepIndex: {
      width: STEP_INDEX_SIZE,
      height: STEP_INDEX_SIZE,
      borderRadius: STEP_INDEX_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceRaised,
      color: theme.colors.text,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      lineHeight: STEP_INDEX_SIZE,
      textAlign: 'center',
    },
    stepText: {
      flex: 1,
    },
    stepTitle: {
      color: theme.colors.text,
      fontSize: 14.5,
    },
    stepHint: {
      color: theme.colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    action: {
      marginTop: 18,
    },
  });
