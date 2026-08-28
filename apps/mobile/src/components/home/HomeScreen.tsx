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
  useAdvanceChallenge,
} from '@/components/challenges';
import { useSession } from '@/lib/auth-client';
import { apiClient } from '@/lib/api';
import heroPattern from '@/assets/hero-pattern.png';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
}: {
  challenge: TodayChallenge;
  isBusy: boolean;
  onAdvance: () => void;
}) {
  const isDone = challenge.status === 'completed';

  return (
    <View style={styles.challengeRow} testID={`home-challenge-${challenge.id}`}>
      <CategoryIcon category={challenge.category} completed={isDone} />

      <View style={styles.challengeBody}>
        <Text numberOfLines={1} style={styles.challengeTitle}>
          {challenge.title}
        </Text>
        <Text style={styles.challengeMeta}>+{challenge.rewardPoints} pts</Text>
      </View>

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
}: {
  icon: 'trophy' | 'bulb';
  label: string;
  onPress: () => void;
  showDivider?: boolean;
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
        <Text style={styles.quickLabel}>{label}</Text>
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

  const displayName = firstNameFrom(
    meQuery.data?.name ?? session?.user.name,
    meQuery.data?.email ?? session?.user.email ?? 'friend',
  );
  const pointsBalance = meQuery.data?.pointsBalance ?? 0;
  const streakDays = meQuery.data?.currentStreakDays ?? 0;
  const challenges = challengesQuery.data?.challenges ?? [];
  const completedCount = challengesQuery.data?.completedCount ?? 0;
  const totalCount = challengesQuery.data?.totalCount ?? 0;
  const hasUnread = true;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={async () => {
            await Promise.all([meQuery.refetch(), challengesQuery.refetch()]);
          }}
          refreshing={meQuery.isRefetching || challengesQuery.isRefetching}
          tintColor={colors.accent}
        />
      }
      style={styles.container}
      testID="home-screen"
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.greeting}>Hi, {displayName}</Text>
        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          style={[styles.bellWrap, hasUnread ? styles.bellWrapUnread : null]}
        >
          <Feather
            color={hasUnread ? colors.accent : colors.muted}
            name="bell"
            size={20}
          />
          {hasUnread ? <View style={styles.unreadDot} /> : null}
        </Pressable>
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
                <MaterialCommunityIcons
                  color={colors.warning}
                  name="fire"
                  size={24}
                  style={styles.flameIcon}
                />
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
            onPress={() => undefined}
            showDivider
          />
          <QuickRow
            icon="bulb"
            label="Health Tips"
            onPress={() => undefined}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Challenges</Text>
            <Pressable onPress={() => router.push('/(tabs)/challenges')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          <View style={styles.challengeCard}>
            {challengesQuery.isLoading ? (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            ) : challenges.length === 0 ? (
              <Text style={styles.empty}>No challenges for today yet.</Text>
            ) : (
              challenges.map((challenge, index) => (
                <View key={challenge.id}>
                  <ChallengeRow
                    challenge={challenge}
                    isBusy={isAdvancing(challenge.id)}
                    onAdvance={() =>
                      advance({
                        userChallengeId: challenge.id,
                        status: challenge.status,
                      })
                    }
                  />
                  {index < challenges.length - 1 ? (
                    <View style={styles.rowDivider} />
                  ) : null}
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.tipBanner}>
          <Ionicons color={colors.warning} name="bulb" size={20} style={styles.tipIcon} />
          <Text style={styles.tipText}>
            Reduce salt today for better blood pressure control.
          </Text>
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
  greeting: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    flex: 1,
  },
  bellWrap: {
    padding: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceRaised,
  },
  bellWrapUnread: {
    backgroundColor: colors.accentSurface,
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
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
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: 4,
  },
  flameIcon: {
    marginBottom: 4,
  },
  streakValue: {
    color: colors.onAccent,
    fontSize: 34,
    fontWeight: fontWeight.semibold,
    lineHeight: 34,
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
  quickLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    flex: 1,
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
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#3A2E1A',
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: '#5C4A28',
    padding: spacing.md,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    color: '#FDE68A',
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSize.sm,
    padding: spacing.lg,
    textAlign: 'center',
  },
  loader: {
    padding: spacing.lg,
  },
});
