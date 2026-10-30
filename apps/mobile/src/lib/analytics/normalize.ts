/**
 * Normalize client property aliases so Admin funnel filters (camelCase) and
 * older snake_case emitters stay aligned without rewriting every call site.
 */
export function normalizeAnalyticsProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...properties };

  if (typeof normalized.experiment_id === 'string' && normalized.experimentId == null) {
    normalized.experimentId = normalized.experiment_id;
  }

  if (
    typeof normalized.experiment_variant === 'string' &&
    normalized.experimentVariantKey == null
  ) {
    normalized.experimentVariantKey = normalized.experiment_variant;
  }

  if (
    typeof normalized.experiment_variant_key === 'string' &&
    normalized.experimentVariantKey == null
  ) {
    normalized.experimentVariantKey = normalized.experiment_variant_key;
  }

  return normalized;
}
