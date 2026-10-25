/** First word of a display or account name, or null when it is not usable. */
export function firstNameFromDisplay(displayName: string | null | undefined): string | null {
  if (!displayName) {
    return null;
  }

  const trimmed = displayName.trim();
  if (!trimmed || trimmed.includes('@')) {
    return null;
  }

  const first = trimmed.split(/\s+/)[0];
  if (!first || first.length < 2) {
    return null;
  }

  return first;
}
