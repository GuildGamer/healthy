import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckNavButton, DeckSegmented, type DeckSegmentOption } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { ROUTINE_COPY } from './constants/routine-copy';

interface ChallengesHeaderProps<Segment extends string> {
  segments: readonly DeckSegmentOption<Segment>[];
  segment: Segment;
  onSelectSegment: (segment: Segment) => void;
  /** Null hides +, which only adds to your own routine. */
  onAdd: (() => void) | null;
}

/** The tab's title, a way to add, and the switch between your routine and your groups. */
export function ChallengesHeader<Segment extends string>({
  segments,
  segment,
  onSelectSegment,
  onAdd,
}: ChallengesHeaderProps<Segment>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>
          {ROUTINE_COPY.title}
        </Text>
        {onAdd ? (
          <DeckNavButton
            accessibilityLabel={ROUTINE_COPY.addLabel}
            glyph="plus"
            onPage
            onPress={onAdd}
            testID="add-challenge"
          />
        ) : null}
      </View>
      <View style={styles.segments}>
        <DeckSegmented
          onSelect={onSelectSegment}
          options={segments}
          selected={segment}
          testID="challenges-segment"
        />
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 20,
    },
    titleRow: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.9,
    },
    segments: {
      marginTop: spacing.md,
    },
  });
