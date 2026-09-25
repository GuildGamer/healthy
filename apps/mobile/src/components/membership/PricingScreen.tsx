import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { MembershipPaymentMethodId } from '@product/contract';
import { formatMembershipAmount } from '@product/contract';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { Loader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import {
  APPLE_IAP_REBUILD_MESSAGE,
  isAppleIapNativeAvailable,
  resolveAppleProductId,
} from '@/lib/apple-membership';
import { useAppleMembership } from '@/lib/use-apple-membership';
import { displayFontFamily } from '@/lib/fonts';

/** Prefer sentence punctuation over dash separators in plan copy. */
function punctuateMembershipCopy(value: string): string {
  return value
    .replace(/\s*[—–]\s*/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

function formatMembershipDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [payMessage, setPayMessage] = useState<string | null>(null);

  const offer = offerQuery.data;
  const selectedPlan =
    offer?.plans.find((plan) => plan.planId === selectedPlanId) ??
    offer?.plans.find((plan) => plan.planId === offer.planId) ??
    offer?.plans[0] ??
    null;

  if (offerQuery.isPending) {
    return (
      <SafeAreaView style={styles.container}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (offerQuery.isError || !offer || !selectedPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          <FormErrorBanner message="Membership is not available yet. Try again soon." />
          <FormButton label="Close" onPress={onClose} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const appleIap = Platform.OS === 'ios';
  const appleProductId = resolveAppleProductId({
    planAppleProductId: selectedPlan.appleProductId,
    offerAppleProductId: offer.appleProductId,
    interval: selectedPlan.interval,
  });
  const amountLabel = formatMembershipAmount(
    selectedPlan.currency,
    selectedPlan.amountMinor,
  );
  const activeMethod = selectedMethod ?? offer.paymentMethods[0]?.id ?? null;
  const intervalLabel =
    selectedPlan.interval === 'month' ? 'per month' : 'per year';
  const cta = appleIap
    ? selectedPlan.ctaLabel?.trim() || 'Subscribe'
    : selectedPlan.ctaLabel?.trim() || `Pay ${amountLabel} ${intervalLabel}`;
  const marketHint =
    offer.countryCode === 'NG' ? 'Nigeria' : 'USD';
  const headline = punctuateMembershipCopy(
    selectedPlan.headline?.trim() ||
      (source === 'success' ? 'Keep that win going' : selectedPlan.name),
  );
  const tagline = selectedPlan.tagline
    ? punctuateMembershipCopy(selectedPlan.tagline)
    : null;

  if (offer.hasMembership) {
    return (
      <SafeAreaView style={styles.container} testID="pricing-screen-active">
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
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>

            <Text style={styles.eyebrow}>Membership</Text>
            <Text style={styles.headline} numberOfLines={2}>
              You are a member
            </Text>
            <Text style={styles.tagline}>
              Full catalog, extra reminders, and finish-what-you-started nudges
              are unlocked.
            </Text>
            {offer.currentSubscription ? (
              <Text style={styles.tagline}>
                {offer.currentSubscription.autoRenewing
                  ? `Renews ${formatMembershipDate(
                      offer.currentSubscription.currentPeriodEndsAt,
                    )}.`
                  : `Access until ${formatMembershipDate(
                      offer.currentSubscription.currentPeriodEndsAt,
                    )}.`}
              </Text>
            ) : null}

            {offer.features.length > 0 ? (
              <View style={styles.perks}>
                {offer.features.map((feature) => (
                  <View key={feature} style={styles.perkRow}>
                    <Text style={styles.perkMark}>✓</Text>
                    <Text numberOfLines={2} style={styles.perkText}>
                      {punctuateMembershipCopy(feature)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <FormButton label="Close" onPress={onClose} testID="pricing-done" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

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

          {selectedPlan.features.length > 0 ? (
            <View style={styles.perks}>
              {selectedPlan.features.map((feature) => (
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

          {offer.plans.length > 1 ? (
            <View style={styles.intervalRow}>
              {offer.plans.map((plan) => {
                const selected = plan.planId === selectedPlan.planId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={plan.planId}
                    onPress={() => setSelectedPlanId(plan.planId)}
                    style={[
                      styles.intervalChip,
                      selected ? styles.intervalChipSelected : null,
                    ]}
                    testID={`pricing-interval-${plan.interval}`}
                  >
                    <Text
                      style={[
                        styles.intervalLabel,
                        selected ? styles.intervalLabelSelected : null,
                      ]}
                    >
                      {plan.interval === 'month' ? 'Monthly' : 'Yearly'}
                    </Text>
                    <Text style={styles.intervalHint}>
                      {formatMembershipAmount(plan.currency, plan.amountMinor)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

        {appleIap ? null : (
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
        )}

        {appleIap ? (
          <AppleCheckoutFooter ctaLabel={cta} productId={appleProductId} />
        ) : (
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
        )}
      </View>
    </SafeAreaView>
  );
}

function AppleCheckoutFooter({
  ctaLabel,
  productId,
}: {
  ctaLabel: string;
  productId: string | null;
}) {
  if (isAppleIapNativeAvailable()) {
    return (
      <AppleStoreCheckoutFooter ctaLabel={ctaLabel} productId={productId} />
    );
  }

  return <UnavailableAppleCheckoutFooter ctaLabel={ctaLabel} />;
}

function UnavailableAppleCheckoutFooter({ ctaLabel }: { ctaLabel: string }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <View style={styles.footer}>
      {message ? <FormErrorBanner message={message} /> : null}
      <FormButton
        label={ctaLabel}
        onPress={() => setMessage(APPLE_IAP_REBUILD_MESSAGE)}
        testID="pricing-pay"
      />
      <FormButton
        label="Restore purchases"
        onPress={() => setMessage(APPLE_IAP_REBUILD_MESSAGE)}
        testID="pricing-restore"
        variant="secondary"
      />
    </View>
  );
}

function AppleStoreCheckoutFooter({
  ctaLabel,
  productId,
}: {
  ctaLabel: string;
  productId: string | null;
}) {
  const queryClient = useQueryClient();
  const { busy, error, restore, subscribe } = useAppleMembership({
    onSynced: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['membership-offer'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
    },
  });

  return (
    <View style={styles.footer}>
      {error ? <FormErrorBanner message={error} /> : null}
      <FormButton
        label={ctaLabel}
        loading={busy}
        onPress={() => {
          void subscribe(productId ?? '');
        }}
        testID="pricing-pay"
      />
      <FormButton
        label="Restore purchases"
        loading={busy}
        onPress={() => {
          void restore();
        }}
        testID="pricing-restore"
        variant="secondary"
      />
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
  intervalRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  intervalChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 2,
  },
  intervalChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  intervalLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  intervalLabelSelected: {
    color: colors.accent,
  },
  intervalHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
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
