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
  ActivityIndicator,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ChallengeActionButton,
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
import heroPattern from '@/assets/hero-pattern.png';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { previewTodayChallenges } from './preview-today-challenges';

/** Figma uses 12px gaps (`space-y-3`) between home sections. */
const SECTION_GAP = 12;
/** Figma `rounded-xl` = 12px. */
const CARD_RADIUS = 12;
/**
 * The scallop tile covers the card evenly, so this is composition rather than
 * legibility: holding the text and divider to a column stops the divider from
 * cutting the pattern in half.
 */
const HERO_CONTENT_WIDTH = '62%';

const FLAME_SIZE = 28;
const FLAME_CORE_SIZE = 16;
/** The glyph's ink is centred in its box, so centring the boxes centres them. */
const FLAME_CORE_LEFT = (FLAME_SIZE - FLAME_CORE_SIZE) / 2;
/**
 * The glyph leaves ~12% of its box empty beneath the ink, so the smaller copy
 * has to be lifted by that difference before its base lines up with the outer
 * flame's, plus a touch more to seat the hot spot just above the base.
 */
const FLAME_CORE_BOTTOM = 3;
/**
 * Optical, not a spacing token: Archivo Black's tight sidebearings make the
 * 8px step read as a detached flame, and 4px crowds it.
 */
const FLAME_GAP = 6;

const categoryVisual: Record<
  TodayChallenge['category'],
  { icon: 'heart' | 'droplet' | 'leaf' | 'activity'; tint: string; iconColor: string }
> = {
  hypertension: { icon: 'heart', tint: '#3A1F24', iconColor: '#F87171' },
  diabetes: { icon: 'droplet', tint: '#1E2A3A', iconColor: '#60A5FA' },
  asthma: { icon: 'leaf', tint: '#1F2E24', iconColor: '#4ADE80' },
  general: { icon: 'activity', tint: '#1F2E24', iconColor: '#4ADE80' },
};

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

function CategoryIcon({
  category,
  completed,
}: {
  category: TodayChallenge['category'];
  completed: boolean;
}) {
  const visual = categoryVisual[category];
  const iconColor = completed ? visual.iconColor : `${visual.iconColor}B3`;

  return (
    <View style={[styles.categoryIcon, { backgroundColor: visual.tint, opacity: completed ? 1 : 0.7 }]}>
      {visual.icon === 'leaf' ? (
        <MaterialCommunityIcons color={iconColor} name="leaf" size={14} />
      ) : (
        <Feather color={iconColor} name={visual.icon} size={14} />
      )}
    </View>
  );
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
          <CategoryIcon category={challenge.category} completed={isDone} />
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
          {icon === 'trophy' ? (
            <Ionicons color={colors.warning} name="trophy" size={14} />
          ) : (
            <Ionicons color={colors.warning} name="bulb" size={14} />
          )}
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
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={async () => {
            await Promise.all([
              meQuery.refetch(),
              challengesQuery.refetch(),
              notificationsQuery.refetch(),
            ]);
          }}
          refreshing={
            meQuery.isRefetching ||
            challengesQuery.isRefetching ||
            notificationsQuery.isRefetching
          }
          tintColor={colors.accent}
        />
      }
      style={styles.container}
      testID="home-screen"
    >
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
            <Feather color={colors.accent} name="user" size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/activity')}
          testID="home-points-card"
        >
          <ImageBackground
            imageStyle={styles.heroPattern}
            resizeMode="repeat"
            source={heroPattern}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
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
              <View style={styles.heroDivider} />
              <View style={styles.pointsRow}>
                <Text style={styles.pointsLabel}>Points</Text>
                <Text style={styles.pointsValue}>{pointsBalance.toLocaleString()}</Text>
              </View>
            </View>
          </ImageBackground>
        </Pressable>

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
              <ActivityIndicator color={colors.accent} style={styles.loader} />
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
    </ScrollView>
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
  header: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: SECTION_GAP,
    gap: SECTION_GAP,
  },
  heroCard: {
    backgroundColor: colors.accent,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: 22,
    paddingBottom: spacing.lg,
    minHeight: 148,
  },
  heroPattern: {
    borderRadius: CARD_RADIUS,
  },
  heroContent: {
    width: HERO_CONTENT_WIDTH,
  },
  streakRow: {
    flexDirection: 'row',
    // Baseline, not flex-end: the icon is a glyph too, so this stays aligned
    // if the numeral face or its line height ever changes again.
    alignItems: 'baseline',
    gap: FLAME_GAP,
    marginBottom: 4,
  },
  /**
   * Wrapping the pair gives the core a coordinate space that is the outer
   * flame's box rather than the whole row, which is taller because of the
   * numeral's line height.
   */
  flame: {
    position: 'relative',
  },
  flameCore: {
    position: 'absolute',
    left: FLAME_CORE_LEFT,
    bottom: FLAME_CORE_BOTTOM,
  },
  streakValue: {
    color: colors.onAccent,
    fontFamily: displayFontFamily,
    fontSize: 34,
    // No fontWeight: the face is already black, and asking for a weight it has
    // no file for makes Android synthesise a smeared bold.
    lineHeight: 38,
  },
  heroMeta: {
    color: colors.onAccent,
    opacity: 0.75,
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.onAccent,
    opacity: 0.18,
    marginBottom: 14,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pointsLabel: {
    color: colors.onAccent,
    opacity: 0.65,
    fontSize: fontSize.xs,
  },
  pointsValue: {
    color: colors.onAccent,
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
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
