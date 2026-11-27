import type { MatchStanding } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles, withAlpha } from '@/theme';
import { GroupFace } from './GroupFace';
import type { GroupRules } from './group-rule-copy';
import { groupToneFor } from './group-tone';
import { displayNameFor } from './group-today';

/** Second, first, third: the winner stands in the middle, tallest. */
const PODIUM_ORDER = [1, 0, 2] as const;
const STEP_HEIGHT = [196, 150, 120] as const;
const STEP_WIDTH = 96;
const CLINIC_WHITE_WASH = 0.14;

/** The top three on steps; your own step is outlined wherever it stands. */
export function GroupPodium({
  standings,
  rules,
}: {
  standings: readonly MatchStanding[];
  rules: GroupRules;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const tone = groupToneFor(theme, rules);
  const winnerFill = theme.deckCards.hasToneRail
    ? withAlpha(tone.tone, CLINIC_WHITE_WASH)
    : tone.fill;

  return (
    <View style={styles.podium} testID="match-podium">
      {PODIUM_ORDER.map((place) => {
        const standing = standings[place];
        if (!standing) {
          return null;
        }

        const isFirst = place === 0;
        return (
          <View
            key={standing.userId}
            style={[
              styles.step,
              { height: STEP_HEIGHT[place] },
              isFirst ? { backgroundColor: winnerFill } : null,
              standing.isYou ? styles.you : null,
            ]}
            testID={`match-podium-${place + 1}`}
          >
            <GroupFace
              image={standing.image}
              look="lit"
              name={standing.displayName}
              size={isFirst ? 52 : 36}
              userId={standing.userId}
            />
            <Text style={styles.score}>{standing.score}</Text>
            <Text numberOfLines={1} style={styles.name}>
              {displayNameFor(standing)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    podium: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 10,
      marginTop: 26,
    },
    step: {
      width: STEP_WIDTH,
      alignItems: 'center',
      gap: 6,
      paddingTop: 12,
      paddingHorizontal: spacing.xs,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.colors.surface,
    },
    you: {
      borderColor: theme.colors.text,
    },
    score: {
      color: theme.colors.text,
      fontSize: 26,
      fontWeight: fontWeight.semibold,
    },
    name: {
      color: theme.colors.muted,
      fontSize: fontSize.xs + 1,
    },
  });
