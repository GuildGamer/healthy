import {
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { apiClient } from '@/lib/api';

export function ActivityScreen() {
  const activityQuery = useQuery({
    queryKey: ['activity'],
    queryFn: () => apiClient.listActivity(),
  });

  const items = activityQuery.data?.items ?? [];
  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => activityQuery.refetch()}
      style={styles.container}
    >
      <Text style={styles.subtitle}>Points you have earned recently</Text>

      {activityQuery.isLoading ? (
        <View style={styles.loader}>
          <Loader />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          Complete a challenge to see your first points activity.
        </Text>
      ) : (
        items.map((item, index) => (
          <View key={item.id}>
            <View style={styles.row} testID={`activity-${item.id}`}>
              <View style={styles.rowBody}>
                <Text style={styles.reason}>{item.reason}</Text>
                <Text style={styles.timestamp}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.delta,
                  item.delta < 0 ? styles.deltaPenalty : null,
                ]}
              >
                {item.delta > 0 ? `+${item.delta}` : String(item.delta)}
              </Text>
            </View>
            {index === items.length - 1 ? null : <View style={styles.divider} />}
          </View>
        ))
      )}
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  reason: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  timestamp: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  delta: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  deltaPenalty: {
    color: colors.danger,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  loader: {
    marginTop: spacing.xl,
  },
});
