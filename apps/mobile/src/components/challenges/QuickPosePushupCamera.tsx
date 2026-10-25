import {
  QuickPoseExerciseCamera,
} from './QuickPoseExerciseCamera';

type QuickPosePushupCameraProps = {
  sdkKey: string;
  onUpdate: (update: {
    results: Record<string, number>;
    feedbacks: Record<string, string>;
  }) => void;
};

/** @deprecated Prefer QuickPoseExerciseCamera with an explicit metric. */
export function QuickPosePushupCamera({ sdkKey, onUpdate }: QuickPosePushupCameraProps) {
  return <QuickPoseExerciseCamera metric="pushups" onUpdate={onUpdate} sdkKey={sdkKey} />;
}
