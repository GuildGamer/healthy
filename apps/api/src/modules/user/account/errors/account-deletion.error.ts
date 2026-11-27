import type { AccountDeletionRefusal } from '@product/contract';

/** The only expected refusal: a store plan that would keep billing a deleted account. */
export type AccountDeletionError = AccountDeletionRefusal;
