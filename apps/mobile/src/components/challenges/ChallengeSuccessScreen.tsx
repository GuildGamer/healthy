import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';

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

  return (
    <SafeAreaView style={styles.container} testID="challenge-success-screen">
      <View style={styles.content}>
        <View style={styles.badgeOuter}>
          <View style={styles.badgeInner}>
            <Feather
              color={colors.onAccent}
              name={wasPenalized ? 'alert-circle' : 'check'}
              size={36}
            />
          </View>
        </View>

        <Text style={styles.kicker}>
          {wasPenalized ? 'Photo check missed' : 'Challenge complete'}
        </Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {wasPenalized
            ? `${penaltyApplied} points were deducted. Tomorrow is a fresh start.`
            : 'Nice work. The points are yours.'}
        </Text>

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

        <FormButton
          label="Done"
          onPress={() => router.replace('/(tabs)')}
          testID="challenge-success-done"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
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
