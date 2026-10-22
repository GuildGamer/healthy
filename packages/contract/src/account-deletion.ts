import { z } from 'zod';

/** The one reason deletion is refused: a store would keep billing an account that no longer exists. */
export const ACCOUNT_DELETION_SUBSCRIPTION_RENEWING = 'subscription_renewing' as const;

/** Where the renewing plan is billed, which is where it has to be cancelled. */
export const accountDeletionBillingStoreSchema = z.enum(['apple', 'google', 'web']);

export const accountDeletionRefusalSchema = z.object({
  reason: z.literal(ACCOUNT_DELETION_SUBSCRIPTION_RENEWING),
  store: accountDeletionBillingStoreSchema,
  renewsAt: z.string().datetime(),
});

export const deleteAccountOutputSchema = z.object({
  deleted: z.literal(true),
});

export type AccountDeletionBillingStore = z.infer<typeof accountDeletionBillingStoreSchema>;
export type AccountDeletionRefusal = z.infer<typeof accountDeletionRefusalSchema>;
export type DeleteAccountOutput = z.infer<typeof deleteAccountOutputSchema>;

/** Reads the refusal from an API error's `data`, or null for any other failure. */
export function readAccountDeletionRefusal(data: unknown): AccountDeletionRefusal | null {
  const parsed = accountDeletionRefusalSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
