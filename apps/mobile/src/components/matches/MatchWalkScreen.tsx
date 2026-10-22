import Feather from '@expo/vector-icons/Feather';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { WalkRouteMap } from '@/components/challenges/WalkRouteMap';
import { useWalkRecorder, type WalkRecording } from '@/components/challenges/useWalkRecorder';
import { apiClient } from '@/lib/api';
import { displayFontFamily } from '@/lib/fonts';
import { goBackOrHome } from '@/lib/go-back';
import { formatDistance, formatDuration, pathDistanceMeters } from '@/lib/geo-session';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import {
  MATCH_WALK_FAILED,
  MATCH_WALK_LOG,
  MATCH_WALK_MIN_SECONDS,
  MATCH_WALK_RESUME,
  MATCH_WALK_START,
  MATCH_WALK_STOP,
  MATCH_WALK_TITLE,
  matchWalkStatus,
} from './match-copy';

/**
 * A contest walk, which is deliberately thinner than the challenge one: there
 * is no goal to meet and no manual "I did this", because a score somebody can
 * type in is not a score the rest of the group can trust.
 */
export function MatchWalkScreen({ matchId }: { matchId: string }) {
  const insets = useSafeAreaInsets();
  const { camera } = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const recorder = useWalkRecorder();
  const [walk, setWalk] = useState<WalkRecording | null>(null);

  const submit = useMutation({
    mutationFn: (recording: WalkRecording) =>
      apiClient.submitMatchAttempt({
        matchId,
        count: Math.floor(recording.durationSeconds / 60),
        durationSeconds: recording.durationSeconds,
        source: 'in_app_walk',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      exit();
    },
  });

  function exit() {
    recorder.abandon();
    goBackOrHome(`/matches/${matchId}`);
  }

  /**
   * Stopping is the walker saying they are done, so it is also the log. A
   * second tap to confirm work the phone already measured is the friction
   * that loses walks.
   */
  function stopWalk(recording: WalkRecording) {
    setWalk(recording);

    if (recording.durationSeconds >= MATCH_WALK_MIN_SECONDS) {
      submit.mutate(recording);
    }
  }

  /** Leaving mid-walk still banks what was measured, rather than binning it. */
  function leave() {
    if (recorder.phase !== 'recording') {
      exit();
      return;
    }

    const recording = recorder.stop();
    if (recording.durationSeconds < MATCH_WALK_MIN_SECONDS) {
      exit();
      return;
    }

    setWalk(recording);
    submit.mutate(recording);
  }

  const { autoPaused, elapsedSeconds, phase, points } = recorder;
  const isRecording = phase === 'recording';
  const tooShort = walk !== null && walk.durationSeconds < MATCH_WALK_MIN_SECONDS;
  const status = matchWalkStatus({
    phase,
    autoPaused,
    countsYet: elapsedSeconds >= MATCH_WALK_MIN_SECONDS,
    saving: submit.isPending,
    tooShort,
  });
  const distanceMeters = walk?.distanceMeters ?? pathDistanceMeters(points);

  return (
    <View style={styles.screen} testID="match-walk-screen">
      <View style={styles.stage}>
        <View style={StyleSheet.absoluteFill} testID="match-walk-map">
          <WalkRouteMap isRecording={isRecording} points={points} />
        </View>

        <View
          pointerEvents="box-none"
          style={[styles.topScrim, { paddingTop: insets.top + spacing.sm }]}
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            onPress={leave}
            style={styles.backButton}
            testID="match-walk-back"
          >
            <Feather color={camera.text} name="arrow-left" size={22} />
          </Pressable>
          <Text style={styles.title}>{MATCH_WALK_TITLE}</Text>
        </View>

        <View pointerEvents="none" style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusEyebrow, autoPaused ? styles.statusEyebrowPaused : null]}>
              {status.eyebrow}
            </Text>
            {phase === 'idle' ? null : (
              <Text style={styles.statusSecondary}>{formatDistance(distanceMeters)}</Text>
            )}
          </View>

          <Text style={styles.statusReadout} testID="match-walk-elapsed">
            {formatDuration(walk?.durationSeconds ?? elapsedSeconds)}
          </Text>
          <Text style={styles.statusMeta}>{status.meta}</Text>
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {/* A short walk is not an error, and the status card over the map has
            already said so. Only a real failure gets a banner. */}
        {recorder.error ? <FormErrorBanner message={recorder.error} /> : null}
        {submit.isError ? <FormErrorBanner message={MATCH_WALK_FAILED} /> : null}

        {phase === 'idle' ? (
          <FormButton
            label={MATCH_WALK_START}
            onPress={() => void recorder.start({ resume: false })}
            testID="match-walk-start"
          />
        ) : null}

        {isRecording ? (
          <FormButton
            label={MATCH_WALK_STOP}
            onPress={() => stopWalk(recorder.stop())}
            testID="match-walk-stop"
          />
        ) : null}

        {/* Stopping already sent it, so this button only exists for the walk
            that failed to send. */}
        {walk && !isRecording && !tooShort ? (
          <FormButton
            label={MATCH_WALK_LOG}
            loading={submit.isPending}
            onPress={() => submit.mutate(walk)}
            testID="match-walk-log"
          />
        ) : null}

        {walk && !isRecording && !submit.isPending ? (
          <FormButton
            label={MATCH_WALK_RESUME}
            onPress={() => {
              setWalk(null);
              void recorder.start({ resume: true });
            }}
            testID="match-walk-resume"
            variant="secondary"
          />
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    stage: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    topScrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: theme.camera.fade,
    },
    backButton: {
      width: 44,
      height: 44,
      marginLeft: -spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      color: theme.camera.text,
      fontFamily: displayFontFamily,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
    },
    statusCard: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.lg,
      gap: spacing.xs,
      backgroundColor: theme.camera.panel,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusEyebrow: {
      color: theme.camera.subtext,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      textTransform: 'uppercase',
    },
    statusEyebrowPaused: {
      color: theme.colors.accent,
    },
    statusSecondary: {
      color: theme.camera.subtext,
      fontSize: fontSize.sm,
    },
    statusReadout: {
      color: theme.camera.text,
      fontFamily: displayFontFamily,
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
    },
    statusMeta: {
      color: theme.camera.subtext,
      fontSize: fontSize.sm,
    },
    controls: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
  });
