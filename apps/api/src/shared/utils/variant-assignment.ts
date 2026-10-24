import { createHash } from 'node:crypto';

type WeightedVariant = {
  id: string;
  weight: number;
};

/**
 * Sticky bucket: same userId + experimentId always lands in the same
 * variant, weighted by relative `weight` values.
 */
export function pickVariantId(
  userId: string,
  experimentId: string,
  variants: readonly WeightedVariant[],
): string | null {
  const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
  if (totalWeight <= 0 || variants.length === 0) {
    return null;
  }

  const digest = createHash('sha256')
    .update(`${userId}:${experimentId}`)
    .digest();
  let bucket = digest.readUInt32BE(0) % totalWeight;

  for (const variant of variants) {
    if (bucket < variant.weight) {
      return variant.id;
    }
    bucket -= variant.weight;
  }

  return variants[variants.length - 1]?.id ?? null;
}
