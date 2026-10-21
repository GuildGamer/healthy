export const INVITE_ACCEPTED_PUSH_TITLE = 'Challenge accepted';

export function inviteAcceptedPushBody(displayName: string): string {
  return `${displayName} accepted your challenge.`;
}
