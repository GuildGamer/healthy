import Feather from '@expo/vector-icons/Feather';
import { colors, fontWeight } from '@product/brand';
import type {
  ChallengeFieldProgress,
  UserChallengeStatus,
} from '@product/client';
import { StyleSheet, Text, View } from 'react-native';
import { challengeProgress } from './challenge-progress';

const RING_SIZE = 28;
const RING_STROKE = 2.5;

function arcBorderColors(fraction: number) {
  const sides = Math.round(fraction * 4);

  return {
    borderTopColor: sides >= 1 ? colors.accent : colors.border,
    borderRightColor: sides >= 2 ? colors.accent : colors.border,
    borderBottomColor: sides >= 3 ? colors.accent : colors.border,
    borderLeftColor: sides >= 4 ? colors.accent : colors.border,
  };
}

export function ChallengeProgressRing({
  fieldProgress,
  status,
  testID,
}: {
  fieldProgress?: ChallengeFieldProgress | null;
  status: UserChallengeStatus;
  testID?: string;
}) {
  const progress = challengeProgress(status, fieldProgress);

  if (progress.kind === 'done') {
    return (
      <View
        accessibilityLabel="Completed"
        style={styles.done}
        testID={testID}
      >
        <Feather color={colors.onAccent} name="check" size={14} />
      </View>
    );
  }

  if (progress.kind === 'idle') {
    return (
      <View
        accessibilityLabel="Not started"
        style={styles.idle}
        testID={testID}
      />
    );
  }

  return (
    <View
      accessibilityLabel={`${progress.step} of ${progress.total}`}
      style={styles.host}
      testID={testID}
    >
      <View
        style={[styles.arc, arcBorderColors(progress.step / progress.total)]}
      />
      <Text style={styles.fraction}>
        {progress.step}/{progress.total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idle: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
    borderColor: colors.border,
  },
  done: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arc: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
    transform: [{ rotate: '-45deg' }],
  },
  fraction: {
    color: colors.text,
    fontSize: 9,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.2,
  },
});
