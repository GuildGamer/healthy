import type { MatchStanding } from '@product/client';
import { fontSize, spacing } from '@product/brand';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DeckSectionTitle } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { type FaceBadge, GroupFace } from './GroupFace';
import { type GroupRules, todayTallyLabel } from './group-rule-copy';
import { displayNameFor, faceLookFor, faceTapFor, sentToday, todayTally } from './group-today';
import { BOARD_COPY } from './match-copy';

const STRIP_FACE_SIZE = 36;
const STRIP_NAME_WIDTH = 48;

function badgeFor(standing: MatchStanding): FaceBadge {
  if (standing.doneToday && !standing.isPending) {
    return 'tick';
  }

  return sentToday(standing, 'nudge') ? 'bell' : null;
}

interface GroupTodayStripProps {
  standings: readonly MatchStanding[];
  rules: GroupRules;
  onTapFace: (standing: MatchStanding) => void;
}

/**
 * Who has done today, lit; who has not, outlined. The whole accountability
 * idea in one row, and what the group has instead of a feed.
 */
export function GroupTodayStrip({ standings, rules, onTapFace }: GroupTodayStripProps) {
  const styles = useThemedStyles(createStyles);
  const { done, total } = todayTally(standings);

  return (
    <View testID="match-today-strip">
      <DeckSectionTitle corner={todayTallyLabel(rules, done, total)} label={BOARD_COPY.today} />
      <ScrollView
        contentContainerStyle={styles.strip}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {standings.map((standing) => {
          const isTappable = faceTapFor(standing).kind !== 'none';
          const name = displayNameFor(standing);
          return (
            <View key={standing.userId} style={styles.who}>
              <GroupFace
                accessibilityLabel={name}
                badge={badgeFor(standing)}
                image={standing.image}
                isRinged={sentToday(standing, 'cheer') !== null}
                look={faceLookFor(standing)}
                name={standing.displayName}
                onPress={isTappable ? () => onTapFace(standing) : undefined}
                size={STRIP_FACE_SIZE}
                testID={`match-face-${standing.userId}`}
                userId={standing.userId}
              />
              <Text numberOfLines={1} style={styles.name}>
                {name}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    strip: {
      gap: 14,
      paddingHorizontal: spacing.xs,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    who: {
      width: STRIP_NAME_WIDTH,
      alignItems: 'center',
      gap: 6,
    },
    name: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
    },
  });
