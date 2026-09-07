import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';
import { apiClient } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { stashPendingMatchToken } from '@/lib/pending-match-token';
import { formatMatchTimeLeft } from './format-match-time';
import { MatchCard, MatchKicker, MatchMetricMark } from './match-chrome';
import {
  MATCH_ACCEPT,
  MATCH_INVITE_KICKER,
  MATCH_JOIN_ENDED,
  MATCH_JOIN_FULL,
  MATCH_JOIN_IN,
  MATCH_NOT_NOW,
  MATCH_OPEN_BOARD,
  MATCH_RULE,
  MATCH_SCORING_LABEL,
  MATCH_TITLE,
} from './match-copy';

export function MatchJoinScreen({ token }: { token: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();

  const previewQuery = useQuery({
    queryKey: ['matches', 'preview', token],
    queryFn: () => apiClient.previewMatch({ token }),
    enabled: Boolean(session),
  });

  const join = useMutation({
    mutationFn: () => apiClient.joinMatch({ token }),
    onSuccess: async (board) => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      router.replace(`/matches/${board.id}`);
    },
  });

  if (isSessionPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    void stashPendingMatchToken(token);
    return <Redirect href="/login" />;
  }

  if (previewQuery.isPending) {
    return <ScreenLoader testID="match-join-loading" />;
  }

  const preview = previewQuery.data;
  if (!preview || previewQuery.isError) {
    return (
      <View
        style={[
          styles.screen,
          styles.missing,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
        testID="match-join-missing"
      >
        <View style={styles.missingMark}>
          <Feather color={colors.muted} name="link" size={28} />
        </View>
        <Text style={styles.missingTitle}>Invite not found</Text>
        <Text style={styles.missingCopy}>That invite link is not valid.</Text>
        <FormButton
          label={MATCH_NOT_NOW}
          onPress={() => router.replace('/(tabs)/challenges')}
          variant="secondary"
        />
      </View>
    );
  }

  const matchId = preview.matchId;
  const ended = preview.status !== 'open';
  const full = preview.participantCount >= preview.participantCap;
  const statusLine = ended
    ? MATCH_JOIN_ENDED
    : preview.alreadyJoined
      ? MATCH_JOIN_IN
      : full
        ? MATCH_JOIN_FULL
        : null;

  function leave() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/challenges');
  }

  function openBoard() {
    router.replace(`/matches/${matchId}`);
  }

  return (
    <View style={styles.screen} testID="match-join-screen">
      <View style={styles.main}>
        <MatchKicker>{MATCH_INVITE_KICKER}</MatchKicker>
        <Text style={styles.title}>
          {preview.hostDisplayName} challenged you
        </Text>

        <MatchCard>
          <View style={styles.metricRow}>
            <MatchMetricMark />
            <View style={styles.metricText}>
              <Text style={styles.metricTitle}>{MATCH_TITLE}</Text>
              <Text style={styles.metricSub}>
                {MATCH_SCORING_LABEL}
                {' · '}
                {formatMatchTimeLeft(preview.endsAt)}
              </Text>
            </View>
          </View>
          <Text style={styles.rule}>{MATCH_RULE}</Text>
          <Text style={styles.seats}>
            {preview.participantCount} of {preview.participantCap} joined
          </Text>
        </MatchCard>

        {statusLine ? (
          <View style={styles.statusCard}>
            <Text style={styles.status}>{statusLine}</Text>
          </View>
        ) : null}
        {join.isError ? (
          <FormErrorBanner message="We could not add you to this match." />
        ) : null}
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {preview.alreadyJoined ? (
          <FormButton
            label={MATCH_OPEN_BOARD}
            onPress={openBoard}
            testID="match-join-open"
          />
        ) : null}

        {!preview.alreadyJoined && !ended && !full ? (
          <FormButton
            label={MATCH_ACCEPT}
            loading={join.isPending}
            onPress={() => join.mutate()}
            testID="match-join-accept"
          />
        ) : null}

        <FormButton
          label={MATCH_NOT_NOW}
          onPress={leave}
          testID="match-join-dismiss"
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xxl,
    lineHeight: 36,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  metricTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  metricSub: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  rule: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  seats: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statusCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  status: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  missing: {
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'center',
  },
  missingMark: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  missingTitle: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
  },
  missingCopy: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
