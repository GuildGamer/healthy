import type { CatalogChallenge } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DECK_KIND_GLYPH,
  DECK_PEEK_OFFSET,
  DeckButton,
  DeckCardFrame,
  deckCardKindFor,
} from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { TODAY_COPY } from './constants/today-copy';

const SUGGESTION_ICON_SIZE = 32;

interface FirstRunCardProps {
  suggestions: readonly CatalogChallenge[];
  isEnrolling: (challengeId: string) => boolean;
  onAdd: (challengeId: string) => void;
  onSeeAll: () => void;
}

/** The deck's outline before anything is dealt, so the shape is learned before it fills. */
export function FirstRunCard({ suggestions, isEnrolling, onAdd, onSeeAll }: FirstRunCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stack}>
      <DeckCardFrame
        fill={colors.background}
        footer={
          <DeckButton
            label={TODAY_COPY.emptyAction}
            onPress={onSeeAll}
            testID="home-choose-challenges"
          />
        }
        testID="home-first-run"
        variant="outline"
      >
        <Glyph color={colors.muted} name="plus" size={26} />
        <Text style={styles.title}>{TODAY_COPY.emptyTitle}</Text>
        <Text style={styles.body}>{TODAY_COPY.emptyBody}</Text>
        <View style={styles.suggestions}>
          {suggestions.map((challenge, index) => (
            <SuggestionRow
              challenge={challenge}
              isBusy={isEnrolling(challenge.challengeId)}
              isFirst={index === 0}
              key={challenge.challengeId}
              onAdd={() => onAdd(challenge.challengeId)}
            />
          ))}
        </View>
      </DeckCardFrame>
    </View>
  );
}

function SuggestionRow({
  challenge,
  isBusy,
  isFirst,
  onAdd,
}: {
  challenge: CatalogChallenge;
  isBusy: boolean;
  isFirst: boolean;
  onAdd: () => void;
}) {
  const { colors, deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);
  const kind = deckCardKindFor(challenge);
  const iconFill = deckCards.hasToneRail ? colors.surfaceRaised : deckCards[kind];

  return (
    <Pressable
      accessibilityLabel={`Add ${challenge.title}`}
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy }}
      disabled={isBusy}
      onPress={onAdd}
      style={[styles.row, isFirst ? null : styles.rowDivider]}
      testID={`home-suggest-${challenge.challengeId}`}
    >
      <View style={[styles.icon, { backgroundColor: iconFill }]}>
        <Glyph color={deckCards.tones[kind]} name={DECK_KIND_GLYPH[kind]} size={16} />
      </View>
      <Text numberOfLines={1} style={styles.rowTitle}>
        {challenge.title}
      </Text>
      {isBusy ? (
        <ActivityIndicator color={colors.muted} size="small" />
      ) : (
        <Glyph color={colors.muted} name="plus" size={18} />
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stack: {
      marginTop: DECK_PEEK_OFFSET,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1,
      lineHeight: 34,
      marginTop: 18,
    },
    body: {
      color: theme.colors.muted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 12,
    },
    suggestions: {
      marginTop: 'auto',
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    icon: {
      width: SUGGESTION_ICON_SIZE,
      height: SUGGESTION_ICON_SIZE,
      borderRadius: SUGGESTION_ICON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
  });
