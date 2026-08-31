import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { displayFontFamily } from '@/lib/fonts';
import {
  emptyPointsCopy,
  filterPointsItems,
  formatLedgerTime,
  formatPointsDelta,
  POINTS_SCOPES,
  type PointsScope,
} from './points-scope';

export function PointsScreen() {
  const [scope, setScope] = useState<PointsScope>('all');
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });
  const activityQuery = useQuery({
    queryKey: ['activity'],
    queryFn: () => apiClient.listActivity(),
  });

  const items = activityQuery.data?.items ?? [];
  const visible = filterPointsItems(items, scope);
  const pointsBalance = meQuery.data?.pointsBalance ?? 0;
  const isLoading = meQuery.isPending || activityQuery.isPending;

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() =>
        Promise.all([meQuery.refetch(), activityQuery.refetch()])
      }
      style={styles.container}
      testID="points-screen"
    >
      <View style={styles.balance} testID="points-balance">
        <Text style={styles.eyebrow}>Balance</Text>
        <Text style={styles.balanceValue}>
          {pointsBalance.toLocaleString('en-GB')}
        </Text>
        <Text style={styles.balanceHint}>points on your ledger</Text>
      </View>

      <View style={styles.scopes} testID="points-scope-switch">
        {POINTS_SCOPES.map((option) => {
          const isSelected = option.id === scope;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              key={option.id}
              onPress={() => setScope(option.id)}
              style={styles.scope}
              testID={`points-scope-${option.id}`}
            >
              <Text
                style={[
                  styles.scopeLabel,
                  isSelected ? styles.scopeLabelSelected : null,
                ]}
              >
                {option.label}
              </Text>
              <View
                style={[
                  styles.scopeRule,
                  isSelected ? styles.scopeRuleSelected : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.loader}>
          <Loader />
        </View>
      ) : visible.length === 0 ? (
        <Text style={styles.empty}>{emptyPointsCopy(scope)}</Text>
      ) : (
        visible.map((item, index) => (
          <View key={item.id}>
            <View style={styles.row} testID={`activity-${item.id}`}>
              <View style={styles.rowBody}>
                <Text style={styles.reason}>{item.reason}</Text>
                <Text style={styles.timestamp}>
                  {formatLedgerTime(item.createdAt)}
                </Text>
              </View>
              <Text
                style={[
                  styles.delta,
                  item.delta < 0 ? styles.deltaPenalty : null,
                ]}
              >
                {formatPointsDelta(item.delta)}
              </Text>
            </View>
            {index === visible.length - 1 ? null : (
              <View style={styles.divider} />
            )}
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
  balance: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.3,
  },
  balanceValue: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xxl,
    lineHeight: 38,
  },
  balanceHint: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  scopes: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  scope: {
    paddingBottom: 4,
  },
  scopeLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  scopeLabelSelected: {
    color: colors.accent,
  },
  scopeRule: {
    height: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  scopeRuleSelected: {
    backgroundColor: colors.accent,
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
