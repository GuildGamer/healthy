export type ApplePurchaseErrorCode =
  | 'apple_disabled'
  | 'invalid_transaction'
  | 'product_not_configured'
  | 'duplicate_subscription'
  | 'subscription_linked_to_other_user'
  | 'transaction_not_active';

export type ApplePurchaseError = {
  code: ApplePurchaseErrorCode;
  message: string;
};

export const APPLE_PURCHASE_ERROR_MESSAGE: Record<
  ApplePurchaseErrorCode,
  string
> = {
  apple_disabled: 'Apple membership is not available yet',
  invalid_transaction: 'We could not confirm this Apple purchase',
  product_not_configured: 'This Apple product is not available yet',
  duplicate_subscription: 'You already have an active membership',
  subscription_linked_to_other_user:
    'This Apple subscription is already linked to another Healthy account',
  transaction_not_active: 'This Apple subscription is no longer active',
};
