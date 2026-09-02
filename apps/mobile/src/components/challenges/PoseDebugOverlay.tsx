import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import type { PushupCounterSnapshot } from '@/lib/pose/pushup-counter';

type PoseDebugOverlayProps = {
  snapshot: PushupCounterSnapshot;
};

/** Dev-only signal readout for tuning front-camera counting. */
export function PoseDebugOverlay({ snapshot }: PoseDebugOverlayProps) {
  if (!__DEV__) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.wrap} testID="pose-debug">
      <Text style={styles.panelText}>
        {snapshot.calibrating
          ? `cal ${Math.round(snapshot.calibrationProgress * 100)}%`
          : `${snapshot.phase} · ${Math.round(snapshot.downness * 100)}%`}
      </Text>
      <Text style={styles.panelText}>
        vis {Math.round(snapshot.visibilityRatio * 100)}% · rng{' '}
        {Math.round(snapshot.movementRange * 100)}%
      </Text>
      {snapshot.tooClose ? (
        <Text style={styles.panelText}>too close</Text>
      ) : null}
      {snapshot.movementTooSmall ? (
        <Text style={styles.panelText}>range low</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  panelText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
