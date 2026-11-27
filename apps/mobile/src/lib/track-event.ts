import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from '@product/contract';
import { trackEvent as trackQueuedEvent } from './analytics/track';

export { normalizeAnalyticsProperties } from './analytics/normalize';

/** Best-effort first-party analytics. Never block the UI on failure. */
export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEventProperties<Name> | Record<string, unknown> = {},
): void {
  trackQueuedEvent(name, properties);
}
