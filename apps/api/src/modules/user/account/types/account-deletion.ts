import type { Prisma } from '@product/db';

export type DeletionTransaction = Prisma.TransactionClient;

export type DeletedAccount = { deleted: true };
