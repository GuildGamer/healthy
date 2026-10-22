import { fontWeight } from '@product/brand';
import type { MembershipOfferedPlan } from '@product/contract';
import { formatMembershipAmount } from '@product/contract';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import {
  MEMBERSHIP_INTERVAL_NAME,
  MEMBERSHIP_INTERVAL_UNIT,
  monthsFreeLabel,
  yearlyMonthsFree,
} from './membership-copy';

interface PlanChoiceProps {
  plans: readonly MembershipOfferedPlan[];
  selectedPlanId: string;
  onSelect: (planId: string) => void;
}

/** Two plan cards; the yearly one says how many months it saves. */
export function PlanChoice({ plans, selectedPlanId, onSelect }: PlanChoiceProps) {
  const styles = useThemedStyles(createStyles);
  const savingLabel = monthsFreeLabel(yearlyMonthsFree(plans));

  return (
    <View style={styles.row}>
      {plans.map((plan) => {
        const isSelected = plan.planId === selectedPlanId;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            key={plan.planId}
            onPress={() => onSelect(plan.planId)}
            style={[styles.plan, isSelected ? styles.selected : null]}
            testID={`pricing-interval-${plan.interval}`}
          >
            {plan.interval === 'year' && savingLabel ? (
              <Text style={styles.saving}>{savingLabel}</Text>
            ) : null}
            <Text style={styles.meta}>{MEMBERSHIP_INTERVAL_NAME[plan.interval]}</Text>
            <Text style={styles.amount}>
              {formatMembershipAmount(plan.currency, plan.amountMinor)}
            </Text>
            <Text style={styles.meta}>{MEMBERSHIP_INTERVAL_UNIT[plan.interval]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    plan: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
      padding: 12,
      backgroundColor: theme.colors.surface,
    },
    selected: {
      borderColor: theme.colors.text,
    },
    amount: {
      marginTop: 4,
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.4,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: 12.5,
    },
    saving: {
      position: 'absolute',
      top: -11,
      right: 12,
      overflow: 'hidden',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
      backgroundColor: theme.colors.accent,
      color: theme.colors.onAccent,
      fontSize: 11,
      fontWeight: fontWeight.semibold,
    },
  });
