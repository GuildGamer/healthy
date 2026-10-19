import type { AnalyticsEventName } from '@product/contract';
import { apiClient } from './api';

/**
 * Normalize client property aliases so Admin funnel filters (camelCase) and
 * older snake_case emitters stay aligned without rewriting every call site.
 */
export function normalizeAnalyticsProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...properties };

  if (
    typeof normalized.experiment_id === 'string' &&
    normalized.experimentId == null
  ) {
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

/** Best-effort first-party analytics. Never block the UI on failure. */
export function trackEvent(
  name: AnalyticsEventName,
  properties: Record<string, unknown> = {},
): void {
  void apiClient
    .trackAnalyticsEvent({
      name,
      properties: normalizeAnalyticsProperties(properties),
    })
    .catch(() => {
      // Funnel gaps are preferable to crashing the product path.
    });
}
