import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import {
  DECK_KIND_GLYPH,
  DeckButton,
  DeckCardFrame,
  DeckEyebrow,
  DeckRoundButton,
} from '@/components/deck';
import { Glyph } from '@/components/icons';
import { healthCategoryName } from '@/constants/health-categories';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { DECK_TAG_LABEL } from './constants/today-copy';
import { ChallengeMeasure } from './ChallengeMeasure';
import { deckCardMeasure, deckCardProof, deckCardVerb } from './deck-card-content';
import { positionLabel } from './today-labels';
import type { ChallengeDeckItem } from './types/today-deck';
import { WeekStrip } from './WeekStrip';

interface ChallengeDeckCardProps {
  item: ChallengeDeckItem;
  totalCount: number;
  /** Today's day key; empty until the details land. */
  todayKey: string;
  /** Steps this phone has counted today. */
  phoneSteps: number | null;
  /** Days of the current week, for a weekly card's strip. */
  weekDayKeys: readonly string[] | null;
  isBusy: boolean;
  onAct: () => void;
  onOpen: () => void;
  /** Takes one back, for a count kept on the card such as glasses of water. */
  onDecrement?: (() => void) | null;
}

/** One challenge as the deck deals it: what it is, how far along, how it's proved, and its verb. */
export function ChallengeDeckCard({
  item,
  totalCount,
  todayKey,
  phoneSteps,
  weekDayKeys,
  isBusy,
  onAct,
  onOpen,
  onDecrement = null,
}: ChallengeDeckCardProps) {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { challenge, kind, tag, tip, detail } = item;
  const tone = deckCards.tones[kind];
  const proof = deckCardProof(challenge);
  const showsWeek = challenge.frequency === 'weekly' && weekDayKeys !== null && detail !== null;

  return (
    <DeckCardFrame
      accessibilityHint="Opens the challenge"
      accessibilityLabel={challenge.title}
      fill={deckCards[kind]}
      footer={
        <>
          <View style={styles.proof}>
            <Glyph color={deckCards.subtext} name={proof.glyph} size={16} />
            <Text numberOfLines={1} style={styles.proofText}>
              {proof.line}
            </Text>
          </View>
          <View style={styles.action}>
            {onDecrement ? (
              <DeckRoundButton
                accessibilityLabel="Take one back"
                glyph="minus"
                onPress={onDecrement}
                testID={`decrement-challenge-${challenge.id}`}
              />
            ) : null}
            <DeckButton
              isFlexible
              label={deckCardVerb(challenge)}
              loading={isBusy}
              onPress={onAct}
              testID={`advance-challenge-${challenge.id}`}
            />
          </View>
        </>
      }
      onPress={onOpen}
      railColor={deckCards.hasToneRail ? tone : null}
      testID={`open-challenge-${challenge.challengeId}`}
    >
      <View style={styles.head}>
        <DeckEyebrow
          corner={positionLabel(item.position, totalCount)}
          glyph={DECK_KIND_GLYPH[kind]}
          label={healthCategoryName(challenge.category)}
          labelColor={deckCards.hasToneRail ? tone : undefined}
          tag={tag ? DECK_TAG_LABEL[tag] : null}
        />
        <Text numberOfLines={2} style={styles.title}>
          {challenge.title}
        </Text>
        {tip ? (
          <View style={styles.tip} testID="deck-card-tip">
            <Glyph color={deckCards.subtext} name="leaf" size={14} />
            <Text numberOfLines={2} style={styles.tipText}>
              {tip.title}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.measure}>
        <ChallengeMeasure
          measure={deckCardMeasure(challenge, { detail, todayKey, phoneSteps })}
          tone={tone}
        />
        {showsWeek ? (
          <WeekStrip
            activeDayKeys={detail.activeDayKeys}
            dayKeys={weekDayKeys}
            todayKey={todayKey}
            tone={tone}
          />
        ) : null}
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
    tip: {
      flexDirection: 'row',
      gap: 7,
      marginTop: 10,
      paddingRight: spacing.lg,
    },
    tipText: {
      flex: 1,
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      lineHeight: 20,
    },
    /** Gives way first on a narrow phone, so the measure and the action never move. */
    head: {
      flexShrink: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    measure: {
      flexShrink: 0,
      marginTop: 'auto',
      paddingTop: spacing.md,
    },
    proof: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 14,
    },
    proofText: {
      flexShrink: 1,
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    action: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
  });
