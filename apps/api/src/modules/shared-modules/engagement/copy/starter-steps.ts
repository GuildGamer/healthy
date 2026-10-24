/** Small first step for copy — independent of the member’s goal. */
export function starterStepLabel(input: {
  deviceMetric: string | null;
  completionKind: string;
}): string {
  if (input.deviceMetric === 'pushups') {
    return '5 push-ups';
  }

  if (
    input.deviceMetric === 'steps' ||
    input.deviceMetric === 'walk' ||
    input.deviceMetric === 'run' ||
    input.deviceMetric === 'cycle'
  ) {
    return 'a 5-minute walk';
  }

  if (input.completionKind === 'water') {
    return 'one glass';
  }

  return 'one quick one';
}

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
