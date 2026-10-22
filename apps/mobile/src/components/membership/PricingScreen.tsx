import type { MembershipOffer, MembershipPaymentMethodId } from '@product/contract';
import { formatMembershipAmount } from '@product/contract';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, Platform } from 'react-native';
import { DeckButton } from '@/components/deck';
import { Loader } from '@/components/feedback';
import { InlineNotice } from '@/components/forms';
import { SettingsGroup, SettingsLinkRow, SettingsNote } from '@/components/settings';
import { apiClient } from '@/lib/api';
import { resolveAppleProductId } from '@/lib/apple-membership';
import { AppleCheckoutFooter, PendingCheckoutFooter } from './CheckoutFooter';
import {
  MEMBERSHIP_INTERVAL_UNIT,
  manageSubscriptionLink,
  memberEyebrow,
  punctuateMembershipCopy,
} from './membership-copy';
import { MembershipHero } from './MembershipHero';
import { PaymentMethodChips } from './PaymentMethodChips';
import { PlanChoice } from './PlanChoice';
import { PricingShell } from './PricingShell';

type PricingSource = 'success' | 'profile' | 'other';

type PricingScreenProps = {
  onClose: () => void;
  /** Soft entry after a win — slightly warmer copy. */
  source?: PricingSource;
};

const DEFAULT_HEADLINE = 'Every challenge, and a nudge to finish.';
const WIN_HEADLINE = 'Keep that win going.';

export function PricingScreen({ onClose, source = 'other' }: PricingScreenProps) {
  const offerQuery = useQuery({
    queryKey: ['membership-offer'],
    queryFn: () => apiClient.getMembershipOffer(),
  });
  const offer = offerQuery.data;

  if (offerQuery.isPending) {
    return (
      <PricingShell closeLabel="Close" onClose={onClose}>
        <Loader />
      </PricingShell>
    );
  }

  if (offerQuery.isError || !offer || offer.plans.length === 0) {
    return (
      <PricingShell
        closeLabel="Close"
        dock={<DeckButton label="Close" onPress={onClose} testID="pricing-done" variant="quiet" />}
        onClose={onClose}
      >
        <InlineNotice
          icon="offline"
          message="Membership is not available yet. Try again soon."
          tone="error"
        />
      </PricingShell>
    );
  }

  if (offer.hasMembership) {
    return <MemberView offer={offer} onClose={onClose} />;
  }

  return <OfferView offer={offer} onClose={onClose} source={source} />;
}

/** No selling: when it renews, what is included, and where to manage it. */
function MemberView({ offer, onClose }: { offer: MembershipOffer; onClose: () => void }) {
  const manageLink = manageSubscriptionLink(offer.currentSubscription);

  return (
    <PricingShell closeLabel="Close" onClose={onClose} testID="pricing-screen-active">
      <MembershipHero
        eyebrow={memberEyebrow(offer.currentSubscription)}
        perks={offer.features.map(punctuateMembershipCopy)}
        title="You’re a member."
      />
      {manageLink ? (
        <SettingsGroup>
          <SettingsLinkRow
            isExternal
            label={manageLink.label}
            onPress={() => void Linking.openURL(manageLink.url).catch(() => undefined)}
            testID="pricing-manage"
          />
        </SettingsGroup>
      ) : null}
    </PricingShell>
  );
}

function OfferView({
  offer,
  onClose,
  source,
}: {
  offer: MembershipOffer;
  onClose: () => void;
  source: PricingSource;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState(offer.planId);
  const [selectedMethod, setSelectedMethod] = useState<MembershipPaymentMethodId | null>(null);
  const isAppleCheckout = Platform.OS === 'ios';
  const plan =
    offer.plans.find((candidate) => candidate.planId === selectedPlanId) ?? offer.plans[0];
  if (!plan) {
    return null;
  }

  const amountLabel = formatMembershipAmount(plan.currency, plan.amountMinor);
  const intervalUnit = MEMBERSHIP_INTERVAL_UNIT[plan.interval];
  const verb = isAppleCheckout ? 'Subscribe for' : 'Pay';
  const ctaLabel = plan.ctaLabel?.trim() || `${verb} ${amountLabel} ${intervalUnit}`;
  const fallbackHeadline = source === 'success' ? WIN_HEADLINE : DEFAULT_HEADLINE;

  return (
    <PricingShell
      closeLabel="Not now"
      dock={
        isAppleCheckout ? (
          <AppleCheckoutFooter
            ctaLabel={ctaLabel}
            productId={resolveAppleProductId({
              planAppleProductId: plan.appleProductId,
              offerAppleProductId: offer.appleProductId,
              interval: plan.interval,
            })}
          />
        ) : (
          <PendingCheckoutFooter ctaLabel={ctaLabel} />
        )
      }
      onClose={onClose}
      testID="pricing-screen"
    >
      <MembershipHero
        eyebrow="Membership"
        perks={plan.features.map(punctuateMembershipCopy)}
        title={punctuateMembershipCopy(plan.headline?.trim() || fallbackHeadline)}
      />
      {offer.plans.length > 1 ? (
        <PlanChoice onSelect={setSelectedPlanId} plans={offer.plans} selectedPlanId={plan.planId} />
      ) : null}
      {isAppleCheckout ? null : (
        <PaymentMethodChips
          activeMethod={selectedMethod ?? offer.paymentMethods[0]?.id ?? null}
          methods={offer.paymentMethods}
          onSelect={setSelectedMethod}
        />
      )}
      <SettingsNote centered>
        {isAppleCheckout
          ? 'Cancel any time in the App Store. Groups and the leaderboard stay free.'
          : 'Groups and the leaderboard stay free.'}
      </SettingsNote>
    </PricingShell>
  );
}
