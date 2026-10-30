import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from '@product/contract';
import { normalizeAnalyticsProperties } from './normalize';
import { enqueueAnalyticsEvent } from './queue';

/** Best-effort first-party analytics. Never block the UI on failure. */
export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEventProperties<Name> | Record<string, unknown> = {},
): void {
  enqueueAnalyticsEvent({
    name,
    properties: normalizeAnalyticsProperties(
      properties as Record<string, unknown>,
    ),
  });
}
