import type { ListLeaderboardOutput, MeOutput } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckNavButton,
  DeckNoteCard,
  DeckPushedPage,
  DeckSectionTitle,
} from '@/components/deck';
import { Loader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { boardHeadline, boardLine, boardRows, boardStanding } from './board-rows';
import { BOARD_COPY } from './constants/board';
import { HowTheBoardWorksSheet } from './HowTheBoardWorksSheet';
import { LeaderboardGap, LeaderboardRow } from './LeaderboardRow';
import type { BoardStanding } from './types/board';
import { useShowOnBoard } from './useShowOnBoard';

const HEADLINE_SIZE = 64;

/** This week only: your place, the top three, then the people around you. */
export function LeaderboardScreen() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });
  const boardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiClient.listLeaderboard({ period: 'week' }),
  });

  return (
    <DeckPushedPage
      navRight={
        <DeckNavButton
          accessibilityLabel={BOARD_COPY.howItWorks}
          glyph="help"
          onPage
          onPress={() => setIsHelpOpen(true)}
          testID="leaderboard-help"
        />
      }
      onBack={() => goBackOrHome('/(tabs)/profile')}
      onPullRefresh={() => Promise.all([meQuery.refetch(), boardQuery.refetch()])}
      testID="leaderboard-screen"
      title={BOARD_COPY.title}
    >
      <BoardBody
        board={boardQuery.data}
        isPending={boardQuery.isPending}
        me={meQuery.data}
        onRetry={() => void boardQuery.refetch()}
      />
      {isHelpOpen ? (
        <HowTheBoardWorksSheet
          onClose={() => setIsHelpOpen(false)}
          publicName={meQuery.data?.displayName ?? ''}
        />
      ) : null}
    </DeckPushedPage>
  );
}

interface BoardBodyProps {
  board: ListLeaderboardOutput | undefined;
  me: MeOutput | undefined;
  isPending: boolean;
  onRetry: () => void;
}

function BoardBody({ board, me, isPending, onRetry }: BoardBodyProps) {
  const styles = useThemedStyles(createStyles);
  const showOnBoard = useShowOnBoard(me);

  if (isPending) {
    return (
      <View style={styles.loader}>
        <Loader />
      </View>
    );
  }

  if (!board) {
    return (
      <DeckNoteCard
        action={{ label: BOARD_COPY.tryAgain, onPress: onRetry, testID: 'leaderboard-retry' }}
        body={BOARD_COPY.failedBody}
        glyph="offline"
        testID="leaderboard-error"
        title={BOARD_COPY.failedTitle}
      />
    );
  }

  const standing = boardStanding(board, me?.showOnLeaderboard === false);
  const { eyebrow, headline } = boardHeadline(standing);

  return (
    <View>
      <View style={styles.hero} testID="leaderboard-standing">
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.line}>{boardLine(standing)}</Text>
      </View>
      {standing.kind === 'hidden' ? (
        <View style={styles.showMe} testID="leaderboard-hidden-notice">
          <DeckButton
            label={BOARD_COPY.showMe}
            loading={showOnBoard.isPending}
            onPress={() => showOnBoard.mutate()}
            testID="leaderboard-show-me"
            variant="tonal"
          />
        </View>
      ) : null}
      <BoardList board={board} standing={standing} />
    </View>
  );
}

function BoardList({ board, standing }: { board: ListLeaderboardOutput; standing: BoardStanding }) {
  if (board.entries.length === 0) {
    return (
      <DeckNoteCard
        body={BOARD_COPY.emptyBody}
        glyph="trophy"
        isOutlined
        testID="leaderboard-empty"
        title={BOARD_COPY.emptyTitle}
      />
    );
  }

  return (
    <View>
      <DeckSectionTitle label={BOARD_COPY.topSection} />
      {boardRows(board, standing).map((row, index) =>
        row.kind === 'gap' ? (
          <LeaderboardGap key={row.key} />
        ) : (
          <LeaderboardRow entry={row.entry} isFirst={index === 0} key={row.entry.rank} />
        ),
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loader: {
      marginTop: spacing.xl,
    },
    hero: {
      marginTop: 18,
      paddingHorizontal: spacing.xs,
    },
    eyebrow: {
      color: theme.colors.muted,
      fontSize: 13,
    },
    headline: {
      color: theme.colors.text,
      fontSize: HEADLINE_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -2.5,
      lineHeight: HEADLINE_SIZE + 4,
    },
    line: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      marginTop: 6,
    },
    showMe: {
      marginTop: spacing.md,
    },
  });
