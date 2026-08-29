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
import {
  ChallengeActionButton,
  ChallengeIcon,
  completionRoute,
  frequencyBadge,
  useAdvanceChallenge,
} from '@/components/challenges';
import { selectDailyTip } from '@/components/tips';
import { useSession } from '@/lib/auth-client';
import { useSyncTimeZone } from '@/lib/time-zone';
import { usePushDeviceSync } from '@/lib/use-push-device';
import { displayFontFamily } from '@/lib/fonts';
import { apiClient } from '@/lib/api';
import heroBanner from '@/assets/hero-banner.png';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const isDone = challenge.status === 'completed';

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
          <ChallengeIcon
            category={challenge.category}
            completed={isDone}
            name={challenge.icon}
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
        isBusy={isBusy}
        onPress={onAdvance}
        status={challenge.status}
        testID={`advance-challenge-${challenge.id}`}
      />
    </View>
  );
}

function QuickRow({
  icon,
  label,
  onPress,
  showDivider,
  subtitle,
}: {
  icon: 'trophy' | 'bulb';
  label: string;
  onPress: () => void;
  showDivider?: boolean;
  subtitle?: string;
}) {
  return (
    <>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.quickRow}>
        <View style={styles.quickIcon}>
          <Ionicons color={colors.warning} name={icon} size={14} />
        </View>
        <View style={styles.quickBody}>
          <Text style={styles.quickLabel}>{label}</Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.quickSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Feather color={colors.border} name="chevron-right" size={16} />
      </Pressable>
      {showDivider ? <View style={styles.rowDivider} /> : null}
    </>
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

  useSyncTimeZone(meQuery.data?.timeZone);

  const displayName = firstNameFrom(
    meQuery.data?.name ?? session?.user.name,
    meQuery.data?.email ?? session?.user.email ?? 'friend',
  );
  const pointsBalance = meQuery.data?.pointsBalance ?? 0;
  const streakDays = meQuery.data?.currentStreakDays ?? 0;
  const challenges = challengesQuery.data?.challenges ?? [];
  const previewChallenges = previewTodayChallenges(challenges);
  const completedCount = challengesQuery.data?.completedCount ?? 0;
  const totalCount = challengesQuery.data?.totalCount ?? 0;
  const todayTip = selectDailyTip(
    meQuery.data?.categories ?? [],
    challengesQuery.data?.dayKey ?? '',
  );

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.listNotifications(),
  });
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  usePushDeviceSync(meQuery.data?.reminderEnabled ?? false);

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() =>
        Promise.all([
          meQuery.refetch(),
          challengesQuery.refetch(),
          notificationsQuery.refetch(),
        ])
      }
      style={styles.container}
      testID="home-screen"
    >
      <View style={styles.heroStage}>
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no"
          pointerEvents="none"
          resizeMode="cover"
          source={heroBanner}
          style={styles.heroBanner}
        />
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
          onPress={() => router.push('/(tabs)/activity')}
          style={styles.heroBlock}
          testID="home-points-card"
        >
          <View style={styles.streakRow}>
            <View style={styles.flame}>
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
            <Text style={styles.streakValue}>{streakDays}</Text>
          </View>
          <Text style={styles.heroMeta}>
            day streak &middot; {completedCount}/{totalCount} done today
          </Text>
          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Points</Text>
            <Text style={styles.pointsValue}>{pointsBalance.toLocaleString()}</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.body}>

        <View style={styles.quickCard}>
          <QuickRow
            icon="trophy"
            label="Leaderboard"
            onPress={() => router.push('/leaderboard')}
            showDivider
          />
          <QuickRow
            icon="bulb"
            label="Health Tips"
            onPress={() => router.push('/tips')}
            subtitle={todayTip?.title}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Challenges</Text>
            {challenges.length > previewChallenges.length ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/challenges')}
                testID="home-see-all-challenges"
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.challengeCard}>
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
              previewChallenges.map((challenge, index) => (
                <View key={challenge.id}>
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
              ))
            )}
          </View>
        </View>

      </View>
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  /**
   * Greeting through points. The banner fills this stage and stops before
   * the Leaderboard card (the next sibling in `body`).
   */
  heroStage: {
    overflow: 'hidden',
    position: 'relative',
  },
  heroBanner: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: colors.accent,
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
    paddingBottom: spacing.lg,
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
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  quickIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: '#3A2E1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quickLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  quickSubtitle: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  section: {
    gap: 12,
    paddingTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  seeAll: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
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
    marginLeft: spacing.md,
  },
  firstRun: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
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
    padding: spacing.lg,
  },
});
