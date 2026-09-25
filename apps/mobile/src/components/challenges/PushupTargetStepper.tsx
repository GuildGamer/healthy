import { NumberStepper } from '@/components/forms';
import { PUSHUP_TARGET_MAX, PUSHUP_TARGET_MIN } from './pushup-target';

export function PushupTargetStepper({
  value,
  onChange,
  testID = 'pushup-target-stepper',
}: {
  value: number;
  onChange: (next: number) => void;
  testID?: string;
}) {
  return (
    <NumberStepper
      decrementLabel="Fewer push-ups"
      incrementLabel="More push-ups"
      max={PUSHUP_TARGET_MAX}
      min={PUSHUP_TARGET_MIN}
      onChange={onChange}
      testID={testID}
      value={value}
    />
  );
}
