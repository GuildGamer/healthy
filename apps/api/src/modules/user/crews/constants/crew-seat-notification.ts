export const CREW_SEAT_PUSH_TITLE = 'You are in a group challenge';

/** Names the host and the exercise so the push feels personal. */
export function crewSeatPushBody(hostName: string, activityNoun: string): string {
  return `${hostName} added you to a ${activityNoun} contest. Open it to take part.`;
}
