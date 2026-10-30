/** Lock-screen prompt when a walk bout may be today's Mine goal. */
export function walkOfferNotificationCopy(targetDurationMinutes: number): {
  title: string;
  body: string;
} {
  const minutes = Math.max(1, Math.round(targetDurationMinutes));
  const goal = minutes === 1 ? '1 minute walk' : `${minutes} minute walk`;
  return {
    title: `Are you taking your ${goal}?`,
    body: "Let's keep count.",
  };
}

export const WALK_OFFER_YES_LABEL = 'Yes';
export const WALK_OFFER_NOT_NOW_LABEL = 'Not now';

/** Android background-location service while watching for a walk. */
export const WALK_OFFER_FOREGROUND_SERVICE = {
  notificationTitle: 'Looking out for your walk',
  notificationBody: 'Healthy will ask when it looks like you have started.',
  notificationColor: '#3DDC97',
} as const;
