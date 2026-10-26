import type { Prisma } from '@product/db';

/** The newest clip History may show: filmed and kept, not merely reserved or taken down. */
export const ACTIVITY_PROOF_CLIP_ARGS = {
  where: { status: { in: ['recorded', 'ready', 'expired'] } },
  orderBy: { recordedAt: 'desc' },
  take: 1,
  select: { id: true, code: true, status: true, visibility: true },
} satisfies Prisma.ProofClipFindManyArgs;
