import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { TodayChallenge } from '@product/client';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { ChallengeActionButton } from '@/components/challenges/ChallengeActionButton';
import { ChallengeProgressRing } from '@/components/challenges/ChallengeProgressRing';
import { buildChallengeFocusLayout } from '@/components/challenges/challenge-list-layout';
import { completionRoute } from '@/components/challenges/completion-route';
import { frequencyBadge } from '@/components/challenges/constants/frequency-labels';
import { TodayWinHeader } from '@/components/challenges/TodayWinHeader';
import { useAdvanceChallenge } from '@/components/challenges/useAdvanceChallenge';
import { podiumMedalColor } from '@/components/leaderboard/podium';
import { selectDailyTip } from '@/components/tips';
import { healthCategoryName } from '@/constants/health-categories';
import { useSession } from '@/lib/auth-client';
import { useSyncTimeZone } from '@/lib/time-zone';
import { usePushDeviceSync } from '@/lib/use-push-device';
import { displayFontFamily, tipQuoteFontFamily } from '@/lib/fonts';
import { apiClient } from '@/lib/api';
import heroBanner from '@/assets/hero-banner.png';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { weeklyRankLabel } from './home-rank';
import { previewTodayChallenges } from './preview-today-challenges';

/** Figma uses 12px gaps (`space-y-3`) between home sections. */
const SECTION_GAP = 12;
/** Figma `rounded-xl` = 12px. */
const CARD_RADIUS = 12;
/** Display size for the streak count — points stays a supporting figure. */
const HERO_NUMERAL_SIZE = 34;
const HERO_NUMERAL_LINE_HEIGHT = 38;

const FLAME_SIZE = 22;
const FLAME_CORE_SIZE = 12;
const FLAME_CORE_LEFT = (FLAME_SIZE - FLAME_CORE_SIZE) / 2;
const FLAME_CORE_BOTTOM = 2;
/** Optical: sit the flame against the numeral without kissing it. */
const FLAME_GAP = 2;

function firstNameFrom(name: string | null | undefined, email: string): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed.split(/\s+/)[0] ?? trimmed;
  }
  return email.split('@')[0] ?? 'there';
}

function HomeRankMark({ rank }: { rank: number | null | undefined }) {
  const medal = rank == null ? undefined : podiumMedalColor(rank);

  if (medal) {
    return (
      <Ionicons
        color={medal}
        name="medal"
        size={16}
        testID="home-rank-medal"
      />
    );
  }

  return (
    <Ionicons
      color={colors.accent}
      name="trophy-outline"
      size={16}
      testID="home-rank-trophy"
    />
  );
}

function formatHomeDate(at: Date = new Date()): string {
  return at.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function ChallengeRow({
  challenge,
  isBusy,
  onAdvance,
  onOpen,
}: {
  challenge: TodayChallenge;
  isBusy: boolean;
  onAdvance: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={styles.challengeRow} testID={`home-challenge-${challenge.id}`}>
      <Pressable
        accessibilityHint="Opens schedule and reminders"
        accessibilityLabel={challenge.title}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.challengeBody,
          pressed && styles.challengeBodyPressed,
        ]}
        testID={`open-challenge-${challenge.challengeId}`}
      >
        <View style={styles.challengeOpen}>
          <ChallengeProgressRing
            fieldProgress={challenge.progress}
            status={challenge.status}
            testID={`challenge-progress-${challenge.id}`}
          />
          <View style={styles.challengeText}>
            <Text numberOfLines={1} style={styles.challengeTitle}>
              {challenge.title}
            </Text>
            <Text style={styles.challengeMeta}>
              +{challenge.rewardPoints} pts
              {challenge.frequency === 'daily'
                ? ''
                : ` · ${frequencyBadge[challenge.frequency]}`}
            </Text>
          </View>
          <Feather color={colors.border} name="chevron-right" size={16} />
        </View>
      </Pressable>

      <ChallengeActionButton
        captureKind={challenge.capture.kind}
        completionKind={challenge.completionKind}
        isBusy={isBusy}
        onPress={onAdvance}
        status={challenge.status}
        testID={`advance-challenge-${challenge.id}`}
      />
    </View>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const insets = useSafeAreaInsets();
  const { advance, isAdvancing } = useAdvanceChallenge();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const challengesQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });
  const tipsQuery = useQuery({
    queryKey: ['tips'],
    queryFn: () => apiClient.listTips(),
  });

  useSyncTimeZone(meQuery.data?.timeZone);

  const displayName = firstNameFrom(
    meQuery.data?.name ?? session?.user.name,
    meQuery.data?.email ?? session?.user.email ?? 'friend',
  );
  const pointsBalance = meQuery.data?.pointsBalance ?? 0;
  const streakDays = meQuery.data?.currentStreakDays ?? 0;
  const challenges = challengesQuery.data?.challenges ?? [];
  const layout = buildChallengeFocusLayout(challenges);
  const previewChallenges = previewTodayChallenges(challenges);
  const todayTip = selectDailyTip(
    tipsQuery.data?.tips ?? [],
    meQuery.data?.categories ?? [],
    challengesQuery.data?.dayKey ?? '',
  );

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.listNotifications(),
  });
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiClient.listLeaderboard({ period: 'week' }),
  });

  usePushDeviceSync(meQuery.data?.reminderEnabled ?? false);

  return (
    <View style={styles.container}>
      <Image
        accessibilityElementsHidden
        importantForAccessibility="no"
        pointerEvents="none"
        resizeMode="cover"
        source={heroBanner}
        style={styles.pageBanner}
      />
      <RefreshableScroll
        contentContainerStyle={styles.content}
        onPullRefresh={() =>
          Promise.all([
            meQuery.refetch(),
            challengesQuery.refetch(),
            notificationsQuery.refetch(),
            leaderboardQuery.refetch(),
            tipsQuery.refetch(),
          ])
        }
        style={styles.scroll}
        testID="home-screen"
      >
      <View style={styles.heroStage}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>Hi, {displayName}</Text>
            <Text style={styles.headerDate}>{formatHomeDate()}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel={
                unreadCount > 0
                  ? `${unreadCount} unread notifications`
                  : 'Notifications'
              }
              accessibilityRole="button"
              onPress={() => router.push('/notifications')}
              style={styles.bellWrap}
              testID="open-notifications"
            >
              <Feather color={colors.muted} name="bell" size={20} />
              {unreadCount > 0 ? <View style={styles.unreadBadge} /> : null}
            </Pressable>
            <Pressable
              accessibilityLabel="Profile"
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.avatarWrap}
              testID="open-profile"
            >
              <Ionicons color={colors.accent} name="person-circle" size={36} />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/points')}
          style={styles.heroBlock}
          testID="home-points-card"
        >
          <View style={styles.streakRow}>
            {streakDays > 0 ? (
              <View style={styles.flame} testID="home-streak-flame">
                <MaterialCommunityIcons
                  color={colors.streak}
                  name="fire"
                  size={FLAME_SIZE}
                />
                <MaterialCommunityIcons
                  color={colors.streakCore}
                  name="fire"
                  size={FLAME_CORE_SIZE}
                  style={styles.flameCore}
                />
              </View>
            ) : null}
            <Text style={styles.streakValue}>{streakDays}</Text>
          </View>
          <Text style={styles.heroMeta}>
            day streak &middot; {layout.win.heroMetaSuffix}
          </Text>
          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Points</Text>
            <Text style={styles.pointsValue}>{pointsBalance.toLocaleString()}</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityHint="Opens the weekly leaderboard"
          accessibilityLabel={weeklyRankLabel(leaderboardQuery.data?.currentUserRank)}
          accessibilityRole="button"
          onPress={() => router.push('/leaderboard')}
          style={({ pressed }) => [
            styles.rankLink,
            pressed ? styles.rankLinkPressed : null,
          ]}
          testID="home-leaderboard"
        >
          <HomeRankMark rank={leaderboardQuery.data?.currentUserRank} />
          <Text style={styles.rankLinkLabel}>
            {weeklyRankLabel(leaderboardQuery.data?.currentUserRank)}
          </Text>
          <Feather color={colors.accent} name="chevron-right" size={16} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {todayTip ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/tips')}
            style={styles.tipCard}
            testID="home-daily-tip"
          >
            <Text style={styles.tipEyebrow}>
              Tip · {healthCategoryName(todayTip.category)}
            </Text>
            <Text style={styles.tipQuote}>{todayTip.title}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Challenges</Text>
          {layout.hasMoreBeyondPreview ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/challenges')}
              testID="home-see-all-challenges"
            >
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          ) : null}
        </View>

        {challengesQuery.isLoading ? (
          <View style={styles.loader}>
            <Loader />
          </View>
        ) : challenges.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/manage-challenges')}
            style={styles.firstRun}
            testID="home-choose-challenges"
          >
            <Feather color={colors.accent} name="plus-circle" size={20} />
            <View style={styles.firstRunText}>
              <Text style={styles.firstRunTitle}>
                Choose your challenges
              </Text>
              <Text style={styles.firstRunSubtitle}>
                Pick what you want to work on and how often.
              </Text>
            </View>
            <Feather color={colors.muted} name="chevron-right" size={18} />
          </Pressable>
        ) : (
          <View>
            {layout.win.target > 0 ? (
              <TodayWinHeader testID="home-today-win" win={layout.win} />
            ) : null}
            {layout.focus ? (
              <Text style={styles.focusEyebrow}>Do next</Text>
            ) : null}
            {previewChallenges.map((challenge, index) => (
              <View key={challenge.id}>
                {index === 1 ? (
                  <Text style={styles.focusEyebrow}>Up next</Text>
                ) : null}
                <ChallengeRow
                  challenge={challenge}
                  isBusy={isAdvancing(challenge.id)}
                  onAdvance={() => {
                    const route = completionRoute(challenge);
                    if (route) {
                      router.push(route);
                      return;
                    }

                    advance({
                      userChallengeId: challenge.id,
                      status: challenge.status,
                    });
                  }}
                  onOpen={() =>
                    router.push(`/challenge/${challenge.challengeId}`)
                  }
                />
                {index < previewChallenges.length - 1 ? (
                  <View style={styles.rowDivider} />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </RefreshableScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageBanner: {
    ...StyleSheet.absoluteFillObject,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingBottom: spacing.xl,
  },
  heroStage: {
    position: 'relative',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingBlock: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  headerDate: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bellWrap: {
    padding: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceRaised,
  },
  unreadBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flame: {
    position: 'relative',
  },
  flameCore: {
    position: 'absolute',
    left: FLAME_CORE_LEFT,
    bottom: FLAME_CORE_BOTTOM,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: SECTION_GAP,
    gap: SECTION_GAP,
  },
  heroBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  streakRow: {
    flexDirection: 'row',
    // Baseline, not flex-end: the icon is a glyph too, so this stays aligned
    // if the numeral face or its line height ever changes again.
    alignItems: 'baseline',
    gap: FLAME_GAP,
    marginBottom: 4,
  },
  streakValue: {
    color: colors.accent,
    fontFamily: displayFontFamily,
    fontSize: HERO_NUMERAL_SIZE,
    // No fontWeight: the face is already black, and asking for a weight it has
    // no file for makes Android synthesise a smeared bold.
    lineHeight: HERO_NUMERAL_LINE_HEIGHT,
  },
  heroMeta: {
    color: colors.muted,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pointsLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  pointsValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  rankLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  rankLinkPressed: {
    opacity: 0.7,
  },
  rankLinkLabel: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tipEyebrow: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.3,
  },
  tipQuote: {
    color: colors.text,
    fontFamily: tipQuoteFontFamily,
    fontSize: fontSize.lg,
    lineHeight: 28,
  },
  section: {
    gap: 12,
    paddingTop: SECTION_GAP,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  focusEyebrow: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  seeAll: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  challengeBody: {
    flex: 1,
    minWidth: 0,
  },
  challengeBodyPressed: {
    opacity: 0.7,
  },
  challengeOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  challengeTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  challengeMeta: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  firstRun: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  firstRunText: {
    flex: 1,
    gap: 2,
  },
  firstRunTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  firstRunSubtitle: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  loader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
