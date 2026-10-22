import type { ListNotificationsOutput, TodayChallenge } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DeckNoteCard,
  DeckPushedPage,
  DeckSectionTitle,
  type DeckCardKind,
  deckCardKindFor,
} from '@/components/deck';
import { Loader } from '@/components/feedback';
import { Glyph } from '@/components/icons';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { INBOX_COPY } from './constants/inbox';
import { inboxSections, openPhotoChecks } from './inbox-sections';
import { NotificationRow } from './NotificationRow';
import { PhotoCheckCard } from './PhotoCheckCard';

/** Opening the inbox reads it: anything unread is marked read once it is on screen. */
function useMarkReadOnFocus(unreadCount: number) {
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      if (unreadCount === 0) {
        return;
      }

      void apiClient.markNotificationsRead().then(() => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
    }, [queryClient, unreadCount]),
  );
}

/** What needs you on top, then the record grouped by Today and Earlier. */
export function NotificationsScreen() {
  const inboxQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.listNotifications(),
  });
  const challengesQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  useMarkReadOnFocus(inboxQuery.data?.unreadCount ?? 0);

  return (
    <DeckPushedPage
      onBack={() => goBackOrHome()}
      onPullRefresh={() => Promise.all([inboxQuery.refetch(), challengesQuery.refetch()])}
      testID="notifications-screen"
      title={INBOX_COPY.title}
    >
      <InboxBody
        challenges={challengesQuery.data?.challenges ?? []}
        inbox={inboxQuery.data}
        isPending={inboxQuery.isPending}
        onRetry={() => void inboxQuery.refetch()}
      />
    </DeckPushedPage>
  );
}

interface InboxBodyProps {
  inbox: ListNotificationsOutput | undefined;
  challenges: readonly TodayChallenge[];
  isPending: boolean;
  onRetry: () => void;
}

function InboxBody({ inbox, challenges, isPending, onRetry }: InboxBodyProps) {
  const styles = useThemedStyles(createStyles);

  if (isPending) {
    return (
      <View style={styles.loader} testID="notifications-loading">
        <Loader />
      </View>
    );
  }

  if (!inbox) {
    return (
      <DeckNoteCard
        action={{ label: INBOX_COPY.tryAgain, onPress: onRetry, testID: 'notifications-retry' }}
        body={INBOX_COPY.failedBody}
        glyph="offline"
        testID="notifications-error"
        title={INBOX_COPY.failedTitle}
      />
    );
  }

  const now = new Date();
  const photoChecks = openPhotoChecks(challenges, now);
  if (inbox.notifications.length === 0 && photoChecks.length === 0) {
    return <InboxEmpty />;
  }

  const kindByChallengeId = new Map<string, DeckCardKind>(
    challenges.map((challenge) => [challenge.challengeId, deckCardKindFor(challenge)]),
  );

  return (
    <View>
      {photoChecks.map((challenge) => (
        <PhotoCheckCard challenge={challenge} key={challenge.id} />
      ))}
      {inboxSections(inbox.notifications, now).map((section) => (
        <View key={section.title}>
          <DeckSectionTitle label={section.title} />
          {section.notifications.map((notification, index) => (
            <NotificationRow
              isFirst={index === 0}
              key={notification.id}
              kind={kindByChallengeId.get(notification.payload?.challengeId ?? '') ?? null}
              notification={notification}
              now={now}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function InboxEmpty() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.empty} testID="notifications-empty">
      <Glyph color={colors.muted} name="inbox" size={30} strokeWidth={1.8} />
      <Text style={styles.emptyTitle}>{INBOX_COPY.emptyTitle}</Text>
      <Text style={styles.emptyBody}>{INBOX_COPY.emptyBody}</Text>
    </View>
  );
}

const EMPTY_TEXT_WIDTH = 260;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loader: {
      marginTop: spacing.xl,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 3,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
      marginTop: 14,
    },
    emptyBody: {
      maxWidth: EMPTY_TEXT_WIDTH,
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      textAlign: 'center',
      marginTop: 6,
    },
  });
