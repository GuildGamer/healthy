import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { MembershipOffer, MembershipPaymentMethodId } from '@product/contract';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

type MethodIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const METHOD_ICON: Record<MembershipPaymentMethodId, MethodIconName> = {
  apple_pay: 'apple',
  google_pay: 'google',
  card: 'credit-card-outline',
  bank_transfer: 'bank-outline',
  ussd: 'cellphone',
};

interface PaymentMethodChipsProps {
  methods: MembershipOffer['paymentMethods'];
  activeMethod: MembershipPaymentMethodId | null;
  onSelect: (method: MembershipPaymentMethodId) => void;
}

/** Off the App Store, the regional plan's ways to pay. */
export function PaymentMethodChips({ methods, activeMethod, onSelect }: PaymentMethodChipsProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Pay the way that fits you</Text>
      <View style={styles.methods}>
        {methods.map((method) => {
          const isSelected = method.id === activeMethod;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              key={method.id}
              onPress={() => onSelect(method.id)}
              style={[styles.chip, isSelected ? styles.chipSelected : null]}
              testID={`pricing-method-${method.id}`}
            >
              <MaterialCommunityIcons
                color={isSelected ? colors.text : colors.muted}
                name={METHOD_ICON[method.id]}
                size={22}
              />
              <Text numberOfLines={1} style={styles.chipLabel}>
                {method.label}
              </Text>
              <Text numberOfLines={1} style={styles.chipHint}>
                {method.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    label: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    methods: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      flexGrow: 1,
      flexBasis: '46%',
      maxWidth: '48%',
      gap: 2,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.colors.surface,
    },
    chipSelected: {
      borderColor: theme.colors.text,
    },
    chipLabel: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    chipHint: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
    },
  });
