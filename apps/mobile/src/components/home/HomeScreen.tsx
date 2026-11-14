import type { TodayChallenge } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isCountedOnCard } from '@/components/challenges/challenge-act';
import { anotherSetRoute } from '@/components/challenges/open-pose-contest';
import { canPracticeAgain } from '@/components/challenges/practice-entry';
import {
  attentionSetsLabel,
  ParkedSetsSheet,
  RefreshableScroll,
  syncingSetsLabel,
} from '@/components/feedback';
import { Glyph } from '@/components/icons';
import type { MatchSessionRoute } from '@/components/matches/match-metric';
import { waterGlassCount } from '@/components/challenges/water-glasses';
import { usePendingSync } from '@/lib/pending-sync-store';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { CardActsProvider, useCardActs } from './CardActsProvider';
import { CardToastBar } from './CardToastBar';
import { ChallengeDeckCard } from './ChallengeDeckCard';
import { FinishedDeckCard } from './FinishedDeckCard';
import { withFinishedCard } from './finished-deck';
import { TODAY_COPY } from './constants/today-copy';
import { DayDoneCard } from './DayDoneCard';
import { dayShareParams } from './day-share-route';
import { DoneChips } from './DoneChips';
import { FirstRunCard } from './FirstRunCard';
import { GroupDeckCard } from './GroupDeckCard';
import { DeckErrorCard, DeckSkeleton } from './PlainDeckCards';
import { PresenceLine } from './PresenceLine';
import { TodayDeck } from './TodayDeck';
import { TodayHeader } from './TodayHeader';
import {
  dayMonthLabel,
  lastUpdatedLabel,
  runLabel,
  streakSentence,
  tallyLabel,
  weekdayLabel,
} from './today-labels';
import { TodayTally } from './TodayTally';
import type { DeckItem, TallySegment, TodayFocus } from './types/today-deck';
import { useDayFinishedPage } from './useDayFinishedPage';
import { useFinishedCard } from './useFinishedCard';
import { useFirstRunSuggestions } from './useFirstRunSuggestions';
import { useTodayQueries } from './useTodayQueries';

const SKELETON_SEGMENTS: readonly TallySegment[] = ['a', 'b', 'c', 'd'].map((id) => ({
  id,
  kind: 'walk',
  fill: 0,
  isDone: false,
}));

type TodayData = ReturnType<typeof useTodayQueries>;

export function HomeScreen({ focus = null }: { focus?: TodayFocus | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const today = useTodayQueries();
  const now = new Date();

  return (
    <CardActsProvider>
      <View style={styles.container}>
        <RefreshableScroll
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
          onPullRefresh={today.refetchAll}
          style={styles.scroll}
          testID="home-screen"
        >
          <TodayHeader
            date={dayMonthLabel(now)}
            onOpenInbox={() => router.push('/notifications')}
            unreadCount={today.unreadCount}
            weekday={weekdayLabel(now)}
          />
          <TodayBody focus={focus} today={today} weekday={weekdayLabel(now)} />
        </RefreshableScroll>
        <CardToastBar />
      </View>
    </CardActsProvider>
  );
}

function TodayBody({
  today,
  weekday,
  focus,
}: {
  today: TodayData;
  weekday: string;
  focus: TodayFocus | null;
}) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { challengesQuery, deck } = today;
  const isDayEmpty = challengesQuery.isSuccess && deck.totalCount === 0;
  const firstRun = useFirstRunSuggestions(isDayEmpty, today.categories);

  if (challengesQuery.isPending) {
    return (
      <View style={styles.section}>
        <TodayTally label={null} runLabel={null} segments={SKELETON_SEGMENTS} winLineAfter={null} />
        <DeckSkeleton />
      </View>
    );
  }

  if (challengesQuery.isError && !challengesQuery.data) {
    return (
      <View style={styles.section}>
        <DeckErrorCard onRetry={() => void challengesQuery.refetch()} />
      </View>
    );
  }

  if (isDayEmpty) {
    return (
      <View style={styles.section}>
        <Text style={styles.sentence}>{TODAY_COPY.emptySentence}</Text>
        <FirstRunCard
          isEnrolling={firstRun.isEnrolling}
          onAdd={firstRun.enroll}
          onSeeAll={() => router.push('/manage-challenges')}
          suggestions={firstRun.suggestions}
        />
      </View>
    );
  }

  return <DeckSection focus={focus} today={today} weekday={weekday} />;
}

function DeckSection({
  today,
  weekday,
  focus,
}: {
  today: TodayData;
  weekday: string;
  focus: TodayFocus | null;
}) {
  const styles = useThemedStyles(createStyles);
  const { deck, me, challengesQuery } = today;
  const now = new Date();
  const streakDays = me?.currentStreakDays ?? 0;
  const isLapsed = me?.streakLapsedYesterday ?? false;
  const finished = useFinishedCard();
  const renderItem = useDeckItemRenderer(today, weekday, finished);
  const opensDayPage = useDayFinishedPage(finished.finish, deck.items, finished.dismiss);
  const items =
    finished.finish && !opensDayPage ? withFinishedCard(deck.items, finished.finish) : deck.items;
  const openDoneChallenge = useOpenDoneChallenge(today.liveGroups);
  const isShowingStaleCopy = challengesQuery.isError && challengesQuery.data !== undefined;
  const sync = usePendingSync();
  const [showParked, setShowParked] = useState(false);
  const syncStatus =
    sync.parkedCount > 0
      ? {
          tone: 'attention' as const,
          label: attentionSetsLabel(sync.parkedCount),
          onPress: () => setShowParked(true),
        }
      : sync.pendingCount > 0
        ? { tone: 'syncing' as const, label: syncingSetsLabel(sync.pendingCount) }
        : null;

  return (
    <View style={styles.section}>
      {isLapsed ? (
        <Text style={styles.sentence} testID="home-lapsed">
          {TODAY_COPY.lapsedTitle} <Text style={styles.sentenceMuted}>{TODAY_COPY.lapsedBody}</Text>
        </Text>
      ) : null}
      <TodayTally
        label={tallyLabel(deck)}
        runLabel={runLabel({
          streakDays,
          lapsedYesterday: isLapsed,
          bestStreakDays: me?.bestStreakDays ?? 0,
        })}
        segments={deck.segments}
        syncStatus={syncStatus}
        updatedLabel={isShowingStaleCopy ? lastUpdatedLabel(challengesQuery.dataUpdatedAt) : null}
        winLineAfter={deck.winLineAfter}
      />
      <TodayDeck
        doneCount={deck.isDayDone ? 0 : deck.done.length}
        focus={focus}
        items={items}
        key={items[0]?.type === 'finished' ? items[0].key : 'deck'}
        renderItem={renderItem}
      />
      {deck.isDayDone ? null : <DoneChips items={deck.done} onOpen={openDoneChallenge} />}
      {deck.presence ? <PresenceLine now={now} presence={deck.presence} /> : null}
      {deck.showsMembershipLine ? <MembershipLine /> : null}
      <ParkedSetsSheet
        entries={sync.parked}
        onDismiss={() => setShowParked(false)}
        visible={showParked}
      />
    </View>
  );
}

function useOpenChallenge() {
  const router = useRouter();
  return (challengeId: string) => router.navigate(`/challenge/${challengeId}`);
}

/** A finished camera exercise goes straight to another set; anything else opens its page. */
function useOpenDoneChallenge(liveGroups: Parameters<typeof anotherSetRoute>[2]) {
  const router = useRouter();
  const openChallenge = useOpenChallenge();
  return (challenge: TodayChallenge) => {
    if (canPracticeAgain(challenge)) {
      router.push(anotherSetRoute(challenge.challengeId, challenge.capture?.metric, liveGroups));
      return;
    }

    openChallenge(challenge.challengeId);
  };
}

function useDeckItemRenderer(
  today: TodayData,
  weekday: string,
  finished: Pick<ReturnType<typeof useFinishedCard>, 'dismiss' | 'hold'>,
) {
  const router = useRouter();
  const openChallenge = useOpenChallenge();
  const cardActs = useCardActs();
  const { deck, me } = today;
  const streakDays = me?.currentStreakDays ?? 0;

  function actOnGroup(matchId: string, session: MatchSessionRoute | null) {
    router.push(session ? `/matches/${matchId}/${session}` : `/matches/${matchId}`);
  }

  function openDayShare() {
    router.push({
      pathname: '/share/day',
      params: dayShareParams({
        weekday,
        dateLabel: dayMonthLabel(new Date()),
        completedCount: deck.win.filled,
        totalCount: deck.win.target,
        pointsToday: deck.pointsToday,
        streakDays,
      }),
    });
  }

  return function renderDeckItem(item: DeckItem) {
    if (item.type === 'finished') {
      return <FinishedDeckCard item={item} onHold={finished.hold} onNext={finished.dismiss} />;
    }

    if (item.type === 'dayDone') {
      return (
        <DayDoneCard
          completedCount={deck.win.filled}
          isSharing={false}
          onShare={openDayShare}
          pointsToday={deck.pointsToday}
          streakLine={streakSentence(streakDays)}
          tomorrowTip={today.tomorrowTip}
          totalCount={deck.win.target}
          weekday={weekday}
          weeklyRank={today.weeklyRank}
          weeklyRankAtDayStart={today.weeklyRankAtDayStart}
        />
      );
    }

    if (item.type === 'group') {
      return (
        <GroupDeckCard
          item={item}
          onAct={(session) => actOnGroup(item.match.id, session)}
          onOpen={() => router.push(`/matches/${item.match.id}`)}
        />
      );
    }

    return (
      <ChallengeDeckCard
        isBusy={cardActs.isActing(item.challenge.id)}
        item={item}
        onAct={() => cardActs.act(item.challenge)}
        onDecrement={
          isCountedOnCard(item.challenge) && waterGlassCount(item.challenge) > 0
            ? () => cardActs.removeGlass(item.challenge)
            : null
        }
        onOpen={() => openChallenge(item.challenge.challengeId)}
        phoneSteps={deck.phoneSteps}
        todayKey={today.dayKey}
        totalCount={deck.totalCount}
        weekDayKeys={deck.weekDayKeys}
      />
    );
  };
}

function MembershipLine() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push('/membership')}
      style={styles.membership}
      testID="home-membership-line"
    >
      <Glyph color={colors.muted} name="lock" size={15} />
      <Text style={styles.membershipText}>
        {TODAY_COPY.membershipLine}{' '}
        <Text style={styles.membershipLink}>{TODAY_COPY.membershipLink}</Text>
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: spacing.xl,
    },
    section: {
      marginTop: 20,
      gap: spacing.md,
    },
    sentence: {
      color: theme.colors.text,
      fontSize: 15,
      lineHeight: 21,
      paddingHorizontal: spacing.xs,
    },
    sentenceMuted: {
      color: theme.colors.muted,
    },
    membership: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: spacing.xs,
    },
    membershipText: {
      flex: 1,
      color: theme.colors.muted,
      fontSize: 13,
    },
    membershipLink: {
      color: theme.colors.text,
      fontWeight: fontWeight.medium,
    },
  });
