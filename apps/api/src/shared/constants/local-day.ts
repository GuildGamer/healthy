/**
 * Day keys are local, rows are stamped in UTC. Reading this far before a
 * day's UTC midnight covers the furthest-ahead zone (UTC+14), and this far
 * after the next one covers the furthest-behind (UTC-12), without any offset
 * arithmetic; the rows are then bucketed by local day.
 */
export const LOCAL_DAY_LEAD_MS = 14 * 60 * 60 * 1000;
export const LOCAL_DAY_LAG_MS = 12 * 60 * 60 * 1000;
