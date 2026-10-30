import { firstNameFromDisplay } from '../../../../shared/utils/first-name.js';

export { firstNameFromDisplay };

/** Small first step for copy — independent of the member’s goal. */
export function starterStepLabel(input: {
  deviceMetric: string | null;
  completionKind: string;
}): string {
  if (input.deviceMetric === 'pushups') {
    return '5 push-ups';
  }

  if (input.deviceMetric === 'squats') {
    return '10 squats';
  }

  if (input.deviceMetric === 'plank') {
    return '20 seconds';
  }

  if (
    input.deviceMetric === 'jumping_jacks' ||
    input.deviceMetric === 'burpees' ||
    input.deviceMetric === 'sit_ups' ||
    input.deviceMetric === 'mountain_climbers' ||
    input.deviceMetric === 'lunges'
  ) {
    return 'a short set';
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

  return 'a quick one';
}
