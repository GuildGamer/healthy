import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { MembershipPaymentMethodId } from '@product/contract';
import { formatMembershipAmount } from '@product/contract';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { Loader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { displayFontFamily } from '@/lib/fonts';

/** Prefer sentence punctuation over dash separators in plan copy. */
function punctuateMembershipCopy(value: string): string {
  return value
    .replace(/\s*[—–]\s*/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

const METHOD_ICON: Record<MembershipPaymentMethodId, string> = {
  apple_pay: 'apple',
  google_pay: 'google',
  card: 'credit-card-outline',
  bank_transfer: 'bank-outline',
  ussd: 'cellphone',
};

type PricingScreenProps = {
  onClose: () => void;
  /** Soft entry after a win — slightly warmer copy. */
  source?: 'success' | 'profile' | 'other';
};

export function PricingScreen({
  onClose,
  source = 'other',
}: PricingScreenProps) {
  const offerQuery = useQuery({
    queryKey: ['membership-offer'],
    queryFn: () => apiClient.getMembershipOffer(),
  });
  const [selectedMethod, setSelectedMethod] =
    useState<MembershipPaymentMethodId | null>(null);
  const [payMessage, setPayMessage] = useState<string | null>(null);

  const offer = offerQuery.data;

  if (offerQuery.isPending) {
    return (
      <SafeAreaView style={styles.container}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (offerQuery.isError || !offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          <FormErrorBanner message="Membership is not available yet. Try again soon." />
          <FormButton label="Close" onPress={onClose} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const amountLabel = formatMembershipAmount(offer.currency, offer.amountMinor);
  const activeMethod = selectedMethod ?? offer.paymentMethods[0]?.id ?? null;
  const intervalLabel =
    offer.interval === 'month' ? 'per month' : 'per year';
  const cta =
    offer.ctaLabel?.trim() || `Pay ${amountLabel} ${intervalLabel}`;
  const marketHint =
    offer.countryCode === 'NG' ? 'Nigeria' : 'USD';
  const headline = punctuateMembershipCopy(
    offer.headline?.trim() ||
      (source === 'success' ? 'Keep that win going' : offer.name),
  );
  const tagline = offer.tagline
    ? punctuateMembershipCopy(offer.tagline)
    : null;

  return (
    <SafeAreaView style={styles.container} testID="pricing-screen">
      <View style={styles.body}>
        <View style={styles.top}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={styles.close}
            testID="pricing-close"
          >
            <Text style={styles.closeLabel}>Not now</Text>
          </Pressable>

          <Text style={styles.eyebrow}>Membership</Text>
          <Text style={styles.headline} numberOfLines={2}>
            {headline}
          </Text>
          <Text style={styles.priceLine}>
            <Text style={styles.price}>{amountLabel}</Text>
            <Text style={styles.priceHint}>
              {' '}
              {intervalLabel}. {marketHint}.
            </Text>
          </Text>
          {tagline ? (
            <Text style={styles.tagline} numberOfLines={2}>
              {tagline}
            </Text>
          ) : null}

          {offer.features.length > 0 ? (
            <View style={styles.perks}>
              {offer.features.map((feature) => (
                <View key={feature} style={styles.perkRow}>
                  <Text style={styles.perkMark}>✦</Text>
                  <Text numberOfLines={1} style={styles.perkText}>
                    {punctuateMembershipCopy(feature)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.methodsSection}>
          <Text style={styles.methodsLabel}>Pay the way that fits you</Text>
          <View style={styles.methods}>
            {offer.paymentMethods.map((method) => {
              const selected = method.id === activeMethod;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={method.id}
                  onPress={() => setSelectedMethod(method.id)}
                  style={[
                    styles.methodChip,
                    selected ? styles.methodChipSelected : null,
                  ]}
                  testID={`pricing-method-${method.id}`}
                >
                  <MaterialCommunityIcons
                    color={selected ? colors.accent : colors.muted}
                    name={METHOD_ICON[method.id] as 'credit-card-outline'}
                    size={22}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.methodLabel,
                      selected ? styles.methodLabelSelected : null,
                    ]}
                  >
                    {method.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.methodHint}>
                    {method.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          {payMessage ? <FormErrorBanner message={payMessage} /> : null}
          <FormButton
            label={cta}
            onPress={() =>
              setPayMessage(
                'Payments are almost ready. Your plan and methods are saved. Checkout lands next.',
              )
            }
            testID="pricing-pay"
          />
        </View>
      </View>
    </SafeAreaView>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  top: {
    gap: spacing.xs,
  },
  close: {
    alignSelf: 'flex-end',
    minHeight: 40,
    justifyContent: 'center',
  },
  closeLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headline: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
    lineHeight: 28,
  },
  priceLine: {
    marginTop: 2,
  },
  price: {
    color: colors.accent,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xxl,
  },
  priceHint: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tagline: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  perks: {
    marginTop: spacing.xs,
    gap: 6,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  perkMark: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  perkText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  methodsSection: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 0,
  },
  methodsLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  methodChip: {
    flexGrow: 1,
    flexBasis: '46%',
    maxWidth: '48%',
    alignItems: 'flex-start',
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  methodLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  methodLabelSelected: {
    color: colors.accent,
  },
  methodHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  footer: {
    gap: spacing.sm,
  },
});
