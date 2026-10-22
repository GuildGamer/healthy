import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  useIAP,
  type Purchase,
} from 'expo-iap';
import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  APPLE_PRODUCT_MISSING_MESSAGE,
  isUserCancelledPurchase,
  latestRestorablePurchase,
  messageFromPurchaseError,
  signedTransactionInfoFromPurchase,
  storeListsProduct,
} from '@/lib/apple-membership';

type UseAppleMembershipOptions = {
  onSynced: () => Promise<void>;
};

export function useAppleMembership({ onSynced }: UseAppleMembershipOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const syncPurchase = useCallback(async (purchase: Purchase) => {
    const signedTransactionInfo = signedTransactionInfoFromPurchase(purchase);
    if (!signedTransactionInfo) {
      setError('We could not confirm this Apple purchase');
      return;
    }

    try {
      await apiClient.syncApplePurchase({ signedTransactionInfo });
      await finishTransaction({ purchase, isConsumable: false });
      await onSyncedRef.current();
      setError(null);
    } catch (caught) {
      setError(
        messageFromPurchaseError(
          caught,
          'We could not confirm this Apple purchase. Try Restore purchases.',
        ),
      );
    }
  }, []);

  const { connected, requestPurchase } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void (async () => {
        setBusy(true);
        try {
          await syncPurchase(purchase);
        } finally {
          setBusy(false);
        }
      })();
    },
    onPurchaseError: (purchaseError) => {
      setBusy(false);
      if (isUserCancelledPurchase(purchaseError)) {
        return;
      }

      setError(
        messageFromPurchaseError(
          purchaseError,
          'We could not complete this Apple purchase. Try Restore purchases.',
        ),
      );
    },
  });

  const subscribe = useCallback(
    async (productId: string) => {
      if (!productId) {
        setError('Apple membership is not available yet');
        return;
      }

      if (!connected) {
        setError('Apple payments are still connecting. Try again in a moment.');
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const listed = await fetchProducts({
          skus: [productId],
          type: 'subs',
        });
        if (!storeListsProduct(listed, productId)) {
          setError(APPLE_PRODUCT_MISSING_MESSAGE);
          return;
        }

        await requestPurchase({
          request: { apple: { sku: productId } },
          type: 'subs',
        });
      } catch (caught) {
        if (isUserCancelledPurchase(caught)) {
          return;
        }

        setError(
          messageFromPurchaseError(
            caught,
            'We could not start this Apple purchase. Try Restore purchases.',
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [connected, requestPurchase],
  );

  const restore = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const purchases = await getAvailablePurchases();
      const latest = latestRestorablePurchase(purchases);
      if (!latest) {
        setError('No Apple subscription to restore on this device');
        return;
      }

      await syncPurchase(latest);
    } catch (caught) {
      setError(messageFromPurchaseError(caught, 'We could not restore this Apple purchase'));
    } finally {
      setBusy(false);
    }
  }, [syncPurchase]);

  return { busy, error, restore, subscribe };
}
