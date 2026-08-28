import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiClient } from '@/lib/api';

export function ActivityScreen() {
  const activityQuery = useQuery({
    queryKey: ['activity'],
    queryFn: () => apiClient.listActivity(),
  });

  const items = activityQuery.data?.items ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => activityQuery.refetch()}
          refreshing={activityQuery.isRefetching}
          tintColor={colors.accent}
        />
      }
      style={styles.container}
    >
      <Text style={styles.subtitle}>Points you have earned recently</Text>

      {activityQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          Complete a challenge to see your first points activity.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.row} testID={`activity-${item.id}`}>
              <View style={styles.rowBody}>
                <Text style={styles.reason}>{item.reason}</Text>
                <Text style={styles.timestamp}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.delta}>
                {item.delta > 0 ? `+${item.delta}` : String(item.delta)}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowBody: {
    flex: 1,
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
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 22,
  },
  loader: {
    marginTop: spacing.xl,
  },
});
