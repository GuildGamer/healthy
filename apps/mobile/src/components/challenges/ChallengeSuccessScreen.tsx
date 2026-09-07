import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { apiClient } from '@/lib/api';
import { displayFontFamily } from '@/lib/fonts';
import {
  clearPendingShareCard,
  peekPendingShareCard,
  type ShareCardPayload,
} from '@/lib/share-card-session';
import {
  ChallengeShareCard,
  SHARE_CARD_ASPECT_RATIO,
} from './ChallengeShareCard';

type ChallengeSuccessScreenProps = {
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
  penaltyApplied?: number;
  completedCount?: number;
  targetCount?: number;
  matchId?: string;
};

export function ChallengeSuccessScreen({
  title,
  pointsAwarded,
  currentStreakDays,
  penaltyApplied = 0,
  completedCount,
  targetCount,
  matchId,
}: ChallengeSuccessScreenProps) {
  const router = useRouter();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });
  const hasMembership = meQuery.data?.hasMembership ?? false;
  const wasPenalized = penaltyApplied > 0;
  const shareShotRef = useRef<View>(null);
  const [pendingShare] = useState<ShareCardPayload | null>(() =>
    peekPendingShareCard(),
  );
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearPendingShareCard();
    };
  }, []);

  async function shareBrandedPhoto() {
    setShareError(null);
    setShareBusy(true);

    try {
      if (!shareShotRef.current) {
        setShareError('Could not prepare that image. Try again.');
        return;
      }

      const uri = await captureRef(shareShotRef, {
        format: 'jpg',
        quality: 0.92,
        result: 'tmpfile',
      });

      if (!(await Sharing.isAvailableAsync())) {
        setShareError('Sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share your Healthy win',
      });
    } catch {
      setShareError('Could not share that image. Try again.');
    } finally {
      setShareBusy(false);
    }
  }

  const isMatch = Boolean(matchId);
  const cardKicker = isMatch ? 'Match set' : 'Challenge complete';
  const streakDays = isMatch
    ? (meQuery.data?.currentStreakDays ?? currentStreakDays)
    : currentStreakDays;
  const showShare = !wasPenalized;

  return (
    <SafeAreaView style={styles.container} testID="challenge-success-screen">
      <View style={styles.body}>
        {!showShare ? (
          <View style={styles.badgeOuter}>
            <View style={styles.badgeInner}>
              <Feather
                color={colors.onAccent}
                name={wasPenalized ? 'alert-circle' : 'check'}
                size={36}
              />
            </View>
          </View>
        ) : null}

        <Text style={styles.kicker}>
          {wasPenalized ? 'Photo check missed' : cardKicker}
        </Text>
        {showShare ? null : <Text style={styles.title}>{title}</Text>}
        <Text style={styles.subtitle}>
          {wasPenalized
            ? `${penaltyApplied} points were deducted. Tomorrow is a fresh start.`
            : 'Share this card on Instagram, Messages, or your camera roll.'}
        </Text>

        {shareError ? <FormErrorBanner message={shareError} /> : null}

        {showShare ? (
          <FittedShareCard>
            <View
              collapsable={false}
              ref={shareShotRef}
              style={styles.shareShot}
            >
              <ChallengeShareCard
                completedCount={completedCount}
                currentStreakDays={streakDays}
                kicker={cardKicker}
                photoHeight={pendingShare?.photoHeight}
                photoUri={pendingShare?.photoUri}
                photoWidth={pendingShare?.photoWidth}
                pointsAwarded={pointsAwarded}
                targetCount={targetCount}
                title={title}
              />
            </View>
          </FittedShareCard>
        ) : (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>-{penaltyApplied}</Text>
              <Text style={styles.statLabel}>points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{currentStreakDays}</Text>
              <Text style={styles.statLabel}>day streak</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {showShare ? (
          <FormButton
            label="Share"
            loading={shareBusy}
            onPress={() => {
              void shareBrandedPhoto();
            }}
            testID="challenge-success-share"
          />
        ) : null}

        <FormButton
          label={isMatch ? 'Back to match' : "See what's next"}
          onPress={() =>
            router.replace(isMatch && matchId ? `/matches/${matchId}` : '/(tabs)/challenges')
          }
          testID="challenge-success-done"
          variant="secondary"
        />

        {!wasPenalized && !hasMembership && !isMatch ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/membership',
                params: { source: 'success' },
              })
            }
            style={({ pressed }) => [
              styles.membershipLink,
              pressed ? styles.membershipLinkPressed : null,
            ]}
            testID="challenge-success-membership"
          >
            <Text style={styles.membershipLinkLabel}>Unlock membership</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function FittedShareCard({ children }: { children: ReactNode }) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const fittedWidth =
    box.width > 0 && box.height > 0
      ? Math.min(box.width, box.height * SHARE_CARD_ASPECT_RATIO)
      : 0;

  return (
    <View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox({ width, height });
      }}
      style={styles.fitHost}
    >
      <View
        style={
          fittedWidth > 0
            ? {
                width: fittedWidth,
                height: fittedWidth / SHARE_CARD_ASPECT_RATIO,
              }
            : styles.fitFallback
        }
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    minHeight: 0,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  badgeOuter: {
    alignSelf: 'center',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  fitHost: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitFallback: {
    width: '100%',
  },
  shareShot: {
    flex: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
  },
  statLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  membershipLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  membershipLinkPressed: {
    opacity: 0.7,
  },
  membershipLinkLabel: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
