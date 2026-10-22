import type { MatchBoard } from '@product/client';
import { spacing } from '@product/brand';
import { matchTimeLeft } from '@product/contract/match-board';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GroupCard, GroupCardLine } from './GroupCard';
import { GroupFaceStack, stackFacesFrom } from './GroupFaceStack';
import { GroupDaySquares } from './GroupDaySquares';
import { GroupMeasure } from './GroupMeasure';
import { dayStripUnit } from './group-days';
import { groupRuleTitle } from './group-rule-copy';
import { groupToneFor } from './group-tone';
import { groupTitle, placeLabel } from './group-today';
import { BOARD_COPY, GROUPS_COPY } from './match-copy';
import { matchScoreUnitFor } from './match-metric';

const STATUS_CORNER = { completed: 'Ended', cancelled: 'Cancelled' } as const;

function cornerFor(match: MatchBoard): string {
  return match.status === 'open' ? matchTimeLeft(match.endsAt) : STATUS_CORNER[match.status];
}

/**
 * The board's one colour card: the rule, time left, your score and your
 * place. Before anyone joins there is nothing to rank, so it sells the invite.
 */
export function BoardHero({ match, isWaiting }: { match: MatchBoard; isWaiting: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const place = placeLabel(match.standings);
  const tone = groupToneFor(theme, match);
  const you = match.standings.find((row) => row.isYou);

  return (
    <GroupCard
      corner={cornerFor(match)}
      rules={match}
      testID="match-board-hero"
      title={groupTitle(match.standings, match)}
    >
      {isWaiting ? (
        <View testID="match-waiting">
          <GroupCardLine>{BOARD_COPY.waitingBody(groupRuleTitle(match))}</GroupCardLine>
          <View style={styles.seats}>
            <GroupFaceStack faces={stackFacesFrom(match.standings)} />
            <Text style={styles.seatsText}>{BOARD_COPY.seats(match.participantCount)}</Text>
          </View>
        </View>
      ) : (
        <>
          <GroupMeasure
            numeralColor={tone.railColor ?? undefined}
            place={place === GROUPS_COPY.noPlace ? null : place}
            score={match.yourScore}
            unit={
              match.dayStrip
                ? dayStripUnit(match.dayStrip)
                : matchScoreUnitFor(match.scoringMode, match.metric, match.yourScore)
            }
          />
          {match.dayStrip ? (
            <GroupDaySquares
              movedDayKeys={you?.movedDayKeys ?? []}
              strip={match.dayStrip}
              toneColor={tone.tone}
            />
          ) : null}
        </>
      )}
      {match.status === 'cancelled' ? (
        <GroupCardLine>{BOARD_COPY.cancelledBody}</GroupCardLine>
      ) : null}
    </GroupCard>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    seats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: spacing.md,
    },
    seatsText: {
      color: theme.deckCards.subtext,
      fontSize: 14,
    },
  });
