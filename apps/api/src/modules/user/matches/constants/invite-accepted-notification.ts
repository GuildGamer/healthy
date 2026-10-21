export const INVITE_ACCEPTED_PUSH_TITLE = 'See who joined';

export function inviteAcceptedPushBody(displayName: string): string {
  return `${displayName} accepted your challenge.`;
}
