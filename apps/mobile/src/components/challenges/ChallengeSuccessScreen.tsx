import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';
import {
  clearPendingShareCard,
  peekPendingShareCard,
  type ShareCardPayload,
} from '@/lib/share-card-session';
import { ChallengeShareCard } from './ChallengeShareCard';

type ChallengeSuccessScreenProps = {
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
  penaltyApplied?: number;
};

export function ChallengeSuccessScreen({
  title,
  pointsAwarded,
  currentStreakDays,
  penaltyApplied = 0,
}: ChallengeSuccessScreenProps) {
  const router = useRouter();
  const wasPenalized = penaltyApplied > 0;
  const shareShotRef = useRef<View>(null);
  const [shareCard] = useState<ShareCardPayload | null>(() =>
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

  const showShare = Boolean(shareCard) && !wasPenalized;

  return (
    <SafeAreaView style={styles.container} testID="challenge-success-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
          {wasPenalized ? 'Photo check missed' : 'Challenge complete'}
        </Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {wasPenalized
            ? `${penaltyApplied} points were deducted. Tomorrow is a fresh start.`
            : showShare
              ? 'Share the win — Healthy watermark included.'
              : 'Nice work. The points are yours.'}
        </Text>

        {showShare && shareCard ? (
          <View
            collapsable={false}
            ref={shareShotRef}
            style={styles.sharePreview}
          >
            <ChallengeShareCard
              currentStreakDays={shareCard.currentStreakDays}
              photoUri={shareCard.photoUri}
              pointsAwarded={shareCard.pointsAwarded}
              title={shareCard.title}
            />
          </View>
        ) : (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {wasPenalized ? `-${penaltyApplied}` : `+${pointsAwarded}`}
              </Text>
              <Text style={styles.statLabel}>points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{currentStreakDays}</Text>
              <Text style={styles.statLabel}>day streak</Text>
            </View>
          </View>
        )}

        {shareError ? <FormErrorBanner message={shareError} /> : null}

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
          label="See what's next"
          onPress={() => router.replace('/(tabs)/challenges')}
          testID="challenge-success-done"
          variant="secondary"
        />

        {!wasPenalized ? (
          <FormButton
            label="Unlock membership"
            onPress={() =>
              router.push({
                pathname: '/membership',
                params: { source: 'success' },
              })
            }
            testID="challenge-success-membership"
            variant={showShare ? 'secondary' : 'primary'}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
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
  sharePreview: {
    marginVertical: spacing.sm,
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
});
