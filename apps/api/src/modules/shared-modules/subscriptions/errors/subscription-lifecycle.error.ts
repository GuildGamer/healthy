export type SubscriptionLifecycleErrorCode =
  | 'duplicate_subscription'
  | 'subscription_not_found'
  | 'plan_not_found';

export type SubscriptionLifecycleError = {
  code: SubscriptionLifecycleErrorCode;
};
