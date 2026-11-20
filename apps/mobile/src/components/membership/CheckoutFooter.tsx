import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DeckButton } from '@/components/deck';
import { InlineNotice } from '@/components/forms';
import { APPLE_IAP_REBUILD_MESSAGE, isAppleIapNativeAvailable } from '@/lib/apple-membership';
import { useAppleMembership } from '@/lib/use-apple-membership';

const ANDROID_CHECKOUT_PENDING_MESSAGE =
  'Payments are almost ready. Your plan and methods are saved. Checkout lands next.';

export function AppleCheckoutFooter({
  ctaLabel,
  productId,
}: {
  ctaLabel: string;
  productId: string | null;
}) {
  if (isAppleIapNativeAvailable()) {
    return <AppleStoreCheckoutFooter ctaLabel={ctaLabel} productId={productId} />;
  }

  return <UnavailableAppleCheckoutFooter ctaLabel={ctaLabel} />;
}

/** Card and transfer checkout is not built on the server yet; the button says so. */
export function PendingCheckoutFooter({ ctaLabel }: { ctaLabel: string }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      {message ? <InlineNotice icon="clock" message={message} tone="warning" /> : null}
      <DeckButton
        label={ctaLabel}
        onPress={() => setMessage(ANDROID_CHECKOUT_PENDING_MESSAGE)}
        testID="pricing-pay"
      />
    </>
  );
}

function UnavailableAppleCheckoutFooter({ ctaLabel }: { ctaLabel: string }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      {message ? <InlineNotice icon="offline" message={message} tone="error" /> : null}
      <DeckButton
        label={ctaLabel}
        onPress={() => setMessage(APPLE_IAP_REBUILD_MESSAGE)}
        testID="pricing-pay"
      />
      <DeckButton
        label="Restore purchases"
        onPress={() => setMessage(APPLE_IAP_REBUILD_MESSAGE)}
        testID="pricing-restore"
        variant="quiet"
      />
    </>
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
    <>
      {error ? <InlineNotice icon="offline" message={error} tone="error" /> : null}
      <DeckButton
        label={ctaLabel}
        loading={busy}
        onPress={() => {
          void subscribe(productId ?? '');
        }}
        testID="pricing-pay"
      />
      <DeckButton
        disabled={busy}
        label="Restore purchases"
        onPress={() => {
          void restore();
        }}
        testID="pricing-restore"
        variant="quiet"
      />
    </>
  );
}
