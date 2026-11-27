import { oc } from '@orpc/contract';
import { z } from 'zod';
import { countryCodeSchema } from './country-code.js';

/** Sentinel market key for the default (non-NG) USD price. */
export const MEMBERSHIP_DEFAULT_MARKET = '*' as const;

export const membershipIntervalSchema = z.enum(['month', 'year']);
export type MembershipInterval = z.infer<typeof membershipIntervalSchema>;

export const membershipPaymentMethodIdSchema = z.enum([
  'apple_pay',
  'google_pay',
  'card',
  'bank_transfer',
  'ussd',
]);
export type MembershipPaymentMethodId = z.infer<
  typeof membershipPaymentMethodIdSchema
>;

export const membershipCurrencySchema = z.enum(['NGN', 'USD']);
export type MembershipCurrency = z.infer<typeof membershipCurrencySchema>;

export const subscriptionProviderSchema = z.enum(['apple', 'google', 'web']);
export type SubscriptionProvider = z.infer<typeof subscriptionProviderSchema>;

export const subscriptionStatusSchema = z.enum([
  'pending',
  'active',
  'grace_period',
  'billing_retry',
  'cancelled',
  'expired',
  'revoked',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const membershipPlanPriceSchema = z.object({
  id: z.string().min(1),
  marketKey: z.string().min(1),
  currency: membershipCurrencySchema,
  amountMinor: z.number().int().positive(),
});

export const membershipPlanSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  features: z.array(z.string().min(1)).min(1),
  interval: membershipIntervalSchema,
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  headline: z.string().nullable(),
  ctaLabel: z.string().nullable(),
  paymentMethodIds: z.array(membershipPaymentMethodIdSchema),
  prices: z.array(membershipPlanPriceSchema),
  /** True once a live SKU or any subscription exists. Slug/interval then lock. */
  hasLiveBilling: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const upsertMembershipPlanPriceInputSchema = z.object({
  marketKey: z.union([
    z.literal(MEMBERSHIP_DEFAULT_MARKET),
    countryCodeSchema,
  ]),
  currency: membershipCurrencySchema,
  amountMinor: z.number().int().positive(),
});

export const upsertMembershipPlanInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().min(1).max(160),
  features: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  interval: membershipIntervalSchema,
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
  headline: z.string().trim().min(1).max(120).nullable(),
  ctaLabel: z.string().trim().min(1).max(40).nullable(),
  paymentMethodIds: z.array(membershipPaymentMethodIdSchema).max(8),
  prices: z.array(upsertMembershipPlanPriceInputSchema).min(1).max(50),
});

export const updateMembershipPlanInputSchema =
  upsertMembershipPlanInputSchema.extend({
    id: z.string().min(1),
  });

export const membershipPlanOutputSchema = z.object({
  plan: membershipPlanSchema,
});

export const listAdminMembershipPlansOutputSchema = z.object({
  items: z.array(membershipPlanSchema),
});

export const listAdminMembershipPlansContract = oc
  .route({ method: 'GET', path: '/admin/membership-plans' })
  .output(listAdminMembershipPlansOutputSchema);

export const createAdminMembershipPlanContract = oc
  .route({ method: 'POST', path: '/admin/membership-plans' })
  .input(upsertMembershipPlanInputSchema)
  .output(membershipPlanOutputSchema);

export const updateAdminMembershipPlanContract = oc
  .route({ method: 'PUT', path: '/admin/membership-plans' })
  .input(updateMembershipPlanInputSchema)
  .output(membershipPlanOutputSchema);

/** Resolved offer for the signed-in member's country. */
export const membershipPaymentMethodSchema = z.object({
  id: membershipPaymentMethodIdSchema,
  label: z.string().min(1),
  hint: z.string().min(1),
});

export const membershipOfferedPlanSchema = z.object({
  planId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  features: z.array(z.string().min(1)),
  interval: membershipIntervalSchema,
  headline: z.string().nullable(),
  ctaLabel: z.string().nullable(),
  currency: membershipCurrencySchema,
  amountMinor: z.number().int().positive(),
  /** App Store product id. Null until the Apple SKU is configured. */
  appleProductId: z.string().min(1).nullable(),
});

export const membershipCurrentSubscriptionSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  interval: membershipIntervalSchema,
  provider: subscriptionProviderSchema,
  status: subscriptionStatusSchema,
  autoRenewing: z.boolean(),
  currentPeriodEndsAt: z.string().datetime(),
  cancelledAt: z.string().datetime().nullable(),
  currency: membershipCurrencySchema,
  amountMinor: z.number().int().positive(),
});

export const membershipOfferSchema = z.object({
  planId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  features: z.array(z.string().min(1)),
  interval: membershipIntervalSchema,
  headline: z.string().nullable(),
  ctaLabel: z.string().nullable(),
  countryCode: countryCodeSchema.nullable(),
  marketKey: z.string().min(1),
  currency: membershipCurrencySchema,
  amountMinor: z.number().int().positive(),
  paymentMethods: z.array(membershipPaymentMethodSchema).min(1),
  /** Whether the signed-in member already has paid entitlements. */
  hasMembership: z.boolean(),
  currentSubscription: membershipCurrentSubscriptionSchema.nullable(),
  plans: z.array(membershipOfferedPlanSchema).min(1),
  appleProductId: z.string().min(1).nullable(),
});

export const syncApplePurchaseInputSchema = z.object({
  signedTransactionInfo: z.string().min(1),
});

export const syncApplePurchaseOutputSchema = z.object({
  hasMembership: z.boolean(),
  currentPeriodEndsAt: z.string().datetime().nullable(),
});

export const getMembershipOfferContract = oc
  .route({ method: 'GET', path: '/membership/offer' })
  .output(membershipOfferSchema);

export const syncApplePurchaseContract = oc
  .route({ method: 'POST', path: '/membership/apple/sync' })
  .input(syncApplePurchaseInputSchema)
  .output(syncApplePurchaseOutputSchema);

export type MembershipPlan = z.infer<typeof membershipPlanSchema>;
export type UpsertMembershipPlanInput = z.infer<
  typeof upsertMembershipPlanInputSchema
>;
export type UpdateMembershipPlanInput = z.infer<
  typeof updateMembershipPlanInputSchema
>;
export type MembershipOfferedPlan = z.infer<typeof membershipOfferedPlanSchema>;
export type MembershipCurrentSubscription = z.infer<
  typeof membershipCurrentSubscriptionSchema
>;
export type MembershipOffer = z.infer<typeof membershipOfferSchema>;
export type SyncApplePurchaseInput = z.infer<typeof syncApplePurchaseInputSchema>;
export type SyncApplePurchaseOutput = z.infer<
  typeof syncApplePurchaseOutputSchema
>;
