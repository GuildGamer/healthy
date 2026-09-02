import { colors, radii } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import type { PoseFrame, PosePoint } from '@/lib/pose/landmarks';
import { mapSquareModelPointToCoverView } from '@/lib/pose/preview-mapping';

/** Joints drawn on the camera preview so users see what MoveNet is tracking. */
const TRACKED_LANDMARKS = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
] as const satisfies readonly (keyof PoseFrame['points'])[];

type LandmarkName = (typeof TRACKED_LANDMARKS)[number];

/** Connected skeleton — head, torso, both arms. */
const SKELETON_BONES: readonly [LandmarkName, LandmarkName][] = [
  ['leftEar', 'leftEye'],
  ['leftEye', 'nose'],
  ['nose', 'rightEye'],
  ['rightEye', 'rightEar'],
  ['leftShoulder', 'rightShoulder'],
  ['nose', 'leftShoulder'],
  ['nose', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
];

const MIN_DISPLAY_SCORE = 0.25;
const BONE_THICKNESS = 3;

type PoseLandmarkOverlayProps = {
  frame: PoseFrame | null;
  width: number;
  height: number;
  /** Match selfie preview when model input is mirrored. */
  mirror?: boolean;
};

export function PoseLandmarkOverlay({
  frame,
  width,
  height,
  mirror = true,
}: PoseLandmarkOverlayProps) {
  if (!frame || width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID="pose-landmark-overlay"
    >
      {SKELETON_BONES.map(([fromName, toName]) => (
        <SkeletonBone
          key={`${fromName}-${toName}`}
          frame={frame}
          from={frame.points[fromName]}
          height={height}
          mirror={mirror}
          to={frame.points[toName]}
          width={width}
        />
      ))}
      {TRACKED_LANDMARKS.map((name) => (
        <LandmarkDot
          key={name}
          frame={frame}
          height={height}
          mirror={mirror}
          name={name}
          point={frame.points[name]}
          width={width}
        />
      ))}
    </View>
  );
}

function pointInView(
  point: PosePoint,
  frame: PoseFrame,
  width: number,
  height: number,
  mirror: boolean,
): { x: number; y: number } {
  const mapped =
    frame.bufferWidth != null &&
    frame.bufferHeight != null &&
    frame.orientation != null
      ? mapSquareModelPointToCoverView(point.x, point.y, {
          viewWidth: width,
          viewHeight: height,
          bufferWidth: frame.bufferWidth,
          bufferHeight: frame.bufferHeight,
          orientation: frame.orientation,
        })
      : { x: point.x, y: point.y };

  return {
    x: (mirror ? 1 - mapped.x : mapped.x) * width,
    y: mapped.y * height,
  };
}

function SkeletonBone({
  frame,
  from,
  to,
  width,
  height,
  mirror,
}: {
  frame: PoseFrame;
  from: PosePoint | undefined;
  to: PosePoint | undefined;
  width: number;
  height: number;
  mirror: boolean;
}) {
  if (
    !from ||
    !to ||
    from.score < MIN_DISPLAY_SCORE ||
    to.score < MIN_DISPLAY_SCORE
  ) {
    return null;
  }

  const start = pointInView(from, frame, width, height, mirror);
  const end = pointInView(to, frame, width, height, mirror);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (length < 2) {
    return null;
  }

  const angleDegrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  const midScore = Math.min(from.score, to.score);
  const trackedWell = midScore >= 0.45;

  return (
    <View
      style={[
        styles.bone,
        {
          width: length,
          height: BONE_THICKNESS,
          left: (start.x + end.x) / 2 - length / 2,
          top: (start.y + end.y) / 2 - BONE_THICKNESS / 2,
          opacity: Math.min(1, Math.max(0.35, midScore + 0.2)),
          backgroundColor: trackedWell ? colors.accent : colors.warning,
          transform: [{ rotate: `${angleDegrees}deg` }],
        },
      ]}
      testID="pose-skeleton-bone"
    />
  );
}

function LandmarkDot({
  frame,
  name,
  point,
  width,
  height,
  mirror,
}: {
  frame: PoseFrame;
  name: LandmarkName;
  point: PoseFrame['points'][LandmarkName];
  width: number;
  height: number;
  mirror: boolean;
}) {
  if (!point || point.score < MIN_DISPLAY_SCORE) {
    return null;
  }

  const size = dotSize(name);
  const opacity = Math.min(1, Math.max(0.45, point.score + 0.25));
  const trackedWell = point.score >= 0.45;
  const { x, y } = pointInView(point, frame, width, height, mirror);

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          left: x - size / 2,
          top: y - size / 2,
          opacity,
          backgroundColor: trackedWell ? colors.accent : colors.warning,
        },
      ]}
    />
  );
}

function dotSize(name: LandmarkName): number {
  if (name === 'nose') {
    return 10;
  }

  if (name.includes('Ear') || name.includes('Eye')) {
    return 6;
  }

  if (name.includes('Shoulder') || name.includes('Hip')) {
    return 9;
  }

  return 8;
}

const styles = StyleSheet.create({
  bone: {
    position: 'absolute',
    borderRadius: radii.full,
  },
  dot: {
    position: 'absolute',
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.text,
  },
});
