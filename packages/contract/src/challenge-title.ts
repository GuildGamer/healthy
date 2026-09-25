export function formatPushupChallengeTitle(count: number): string {
  const noun = count === 1 ? 'push-up' : 'push-ups';
  return `Do ${count} ${noun}`;
}

/** Push-up names follow the member’s target. Other catalog titles stay as stored. */
export function displayChallengeTitle(input: {
  title: string;
  metric?: string | null;
  count?: number | null;
}): string {
  if (input.metric === 'pushups' && input.count != null && input.count > 0) {
    return formatPushupChallengeTitle(input.count);
  }

  return input.title;
}
