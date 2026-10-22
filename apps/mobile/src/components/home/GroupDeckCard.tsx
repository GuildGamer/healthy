import { fontSize, fontWeight, spacing } from '@product/brand';
import { matchTimeLeft } from '@product/contract/match-board';
import { StyleSheet, Text, View } from 'react-native';
import { DECK_KIND_GLYPH, DeckButton, DeckCardFrame, DeckEyebrow } from '@/components/deck';
import { type MatchSessionRoute, matchBoardAction } from '@/components/matches/match-metric';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { TODAY_COPY } from './constants/today-copy';
import { GroupRoster } from './GroupRoster';
import type { GroupDeckItem } from './types/today-deck';

interface GroupDeckCardProps {
  item: GroupDeckItem;
  onAct: (session: MatchSessionRoute | null) => void;
  onOpen: () => void;
}

/** A live group dealt into the day. The board is one tap into the card. */
export function GroupDeckCard({ item, onAct, onOpen }: GroupDeckCardProps) {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { match, kind } = item;
  const tone = deckCards.tones[kind];
  const action = matchBoardAction(match.scoringMode, match.metric);
  const actionLabel = action.session ? action.label : TODAY_COPY.groupOpenBoard;

  return (
    <DeckCardFrame
      accessibilityHint="Opens the group's board"
      accessibilityLabel={match.title}
      fill={deckCards[kind]}
      footer={
        <View style={styles.action}>
          <DeckButton
            label={actionLabel}
            onPress={() => onAct(action.session)}
            testID={`home-group-act-${match.id}`}
          />
        </View>
      }
      onPress={onOpen}
      railColor={deckCards.hasToneRail ? tone : null}
      testID={`home-group-${match.id}`}
    >
      <View style={styles.head}>
        <DeckEyebrow
          corner={matchTimeLeft(match.endsAt)}
          glyph={DECK_KIND_GLYPH[kind]}
          label={TODAY_COPY.groupEyebrow}
          labelColor={deckCards.hasToneRail ? tone : undefined}
        />
        <Text numberOfLines={2} style={styles.title}>
          {match.title}
        </Text>
      </View>
      <View style={styles.roster}>
        <GroupRoster metric={match.metric} roster={match.roster} scoringMode={match.scoringMode} />
      </View>
    </DeckCardFrame>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      color: theme.deckCards.text,
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1,
      lineHeight: 34,
      marginTop: 14,
    },
    head: {
      flexShrink: 0,
    },
    /** The roster gives way on a small phone; the title and the action do not. */
    roster: {
      flexShrink: 1,
      minHeight: 0,
      overflow: 'hidden',
      marginTop: 'auto',
      paddingTop: spacing.md,
    },
    action: {
      marginTop: 18,
    },
  });
