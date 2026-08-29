import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '@/lib/api';
import type { HealthTip } from './constants/health-tips';
import { selectDailyTip, tipsForCategories } from './select-daily-tip';

function TipCard({ tip, isToday }: { tip: HealthTip; isToday: boolean }) {
  return (
    <View
      style={[styles.card, isToday ? styles.cardToday : null]}
      testID={`tip-${tip.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.icon}>
          <Ionicons color={colors.accent} name="bulb" size={16} />
        </View>
        {isToday ? <Text style={styles.badge}>Today</Text> : null}
      </View>
      <Text style={styles.title}>{tip.title}</Text>
      <Text style={styles.body}>{tip.body}</Text>
    </View>
  );
}

export function TipsScreen() {
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });
  const challengesQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const categories = meQuery.data?.categories ?? [];
  const dayKey = challengesQuery.data?.dayKey ?? '';
  const tips = tipsForCategories(categories);
  const todayTip = selectDailyTip(categories, dayKey);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
      testID="tips-screen"
    >
      <Text style={styles.intro}>
        Small, practical changes for the conditions you are tracking.
      </Text>

      {tips.map((tip) => (
        <TipCard isToday={tip.id === todayTip?.id} key={tip.id} tip={tip} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  intro: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardToday: {
    borderColor: colors.accent,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.accentContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  body: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
