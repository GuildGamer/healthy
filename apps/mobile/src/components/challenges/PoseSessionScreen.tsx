import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useKeepAwake } from 'expo-keep-awake';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckButton, DeckNavButton } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { QUICKPOSE_SDK_KEY } from '@/lib/config';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { POSE_COPY, SAVE_FAILED_MESSAGE } from './constants/doing-copy';
import { PoseCountHud } from './PoseCountHud';
import {
  poseCameraPlacement,
  poseCoachBanner,
  poseReviewTitle,
  poseShortLine,
  PRACTICE_SESSION_TITLE,
} from './pose-session-copy';
import { type PoseSession, type PoseSessionProps, usePoseSession } from './usePoseSession';

export type PoseSessionScreenProps = PoseSessionProps;

const GUIDE_WIDTH = 230;

function pillLabel(props: PoseSessionProps, target: number): string {
  if (props.mode === 'practice') {
    return 'Extra set';
  }

  return target > 0 ? `${POSE_COPY.goal} ${target}` : PRACTICE_SESSION_TITLE;
}

/** Push-ups counted by the camera. The screen is the camera, so it stays dark in either scheme. */
export function PoseSessionScreen(props: PoseSessionScreenProps) {
  // Phone is propped and untouched during setup and the set — keep the backlight on.
  useKeepAwake();

  const styles = useThemedStyles(createStyles);
  const session = usePoseSession(props);

  if (session.isLoading) {
    return <ScreenLoader />;
  }

  return (
    <View style={styles.screen} testID="pose-session-screen">
      <PoseCamera session={session} />
      {session.phase === 'setup' ? <BodyGuide fits={session.snapshot.bodyInFrame} /> : null}
      {session.phase === 'counting' ? (
        <PoseCountHud
          count={session.snapshot.count}
          meta={poseCoachBanner(session.snapshot)}
          target={session.target}
        />
      ) : null}
      <PoseTopBar label={pillLabel(props, session.target)} onClose={session.leave} />
      <PoseBottom mode={props.mode} session={session} />
    </View>
  );
}

function PoseCamera({ session }: { session: PoseSession }) {
  const styles = useThemedStyles(createStyles);
  const { QuickPoseCamera } = session.camera;
  const isLive =
    session.phase !== 'review' && QuickPoseCamera !== null && Boolean(QUICKPOSE_SDK_KEY);

  return (
    <View
      style={[styles.stage, session.phase === 'review' ? styles.stageDimmed : null]}
      testID="pose-camera"
    >
      {isLive && QuickPoseCamera ? (
        <QuickPoseCamera
          key={session.cameraSessionKey}
          metric={session.metric}
          onUpdate={session.handleQuickPoseUpdate}
          sdkKey={QUICKPOSE_SDK_KEY}
        />
      ) : (
        <View style={styles.fallbackWrap}>
          <Text style={styles.fallback}>
            {session.phase === 'review' ? '' : session.camera.detail}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Where to be: dashed until you fit, then solid in the done colour. */
function BodyGuide({ fits }: { fits: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      pointerEvents="none"
      style={[styles.guide, fits ? styles.guideFits : null]}
      testID="pose-guide"
    />
  );
}

function PoseTopBar({ label, onClose }: { label: string; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.topBar, { top: insets.top + spacing.sm }]}>
      <DeckNavButton
        accessibilityLabel="Close"
        glyph="close"
        onPress={onClose}
        overCamera
        testID="pose-back"
      />
      <Text style={styles.pill}>{label}</Text>
      <View style={styles.topSpacer} />
    </View>
  );
}

function PoseBottom({ session, mode }: { session: PoseSession; mode: PoseSessionProps['mode'] }) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, spacing.md) + spacing.md;

  if (session.phase === 'review') {
    return (
      <View style={[styles.panel, { bottom: paddingBottom }]} testID="pose-review">
        <PoseReview mode={mode} session={session} />
      </View>
    );
  }

  return (
    <View style={[styles.fade, { paddingBottom }]}>
      {session.phase === 'counting' ? (
        <View style={styles.stop}>
          <DeckButton
            label={POSE_COPY.stop}
            onPress={session.stopCounting}
            testID="stop-pose"
            variant="cameraGlass"
          />
        </View>
      ) : (
        <PoseSetupHint session={session} />
      )}
    </View>
  );
}

function PoseSetupHint({ session }: { session: PoseSession }) {
  const styles = useThemedStyles(createStyles);
  const placement = poseCameraPlacement(session.metric);
  const sub =
    session.sessionError ??
    (session.camera.isReady ? POSE_COPY.startsByItself : session.camera.detail);

  return (
    <>
      <Text style={styles.hint}>{placement}</Text>
      <Text style={styles.hintSub} testID="pose-status">
        {sub}
      </Text>
      <DeckButton
        label={POSE_COPY.startNow}
        loading={session.isStarting}
        onPress={session.startNow}
        testID="start-pose"
        variant="quiet"
      />
    </>
  );
}

function PoseReview({ session, mode }: { session: PoseSession; mode: PoseSessionProps['mode'] }) {
  const { camera } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { count } = session.snapshot;

  if (session.isSaving) {
    return (
      <View style={styles.saving}>
        <ActivityIndicator color={camera.text} />
        <Text style={styles.panelSub}>{POSE_COPY.saving}</Text>
      </View>
    );
  }

  const canSave = session.meetsTarget;
  const line = canSave
    ? SAVE_FAILED_MESSAGE
    : session.target > 0
      ? poseShortLine({ count, target: session.target })
      : poseReviewTitle({ mode, count, meetsTarget: false });

  return (
    <>
      <Text style={styles.panelCount}>
        {count}
        {session.target > 0 ? <Text style={styles.panelOf}> of {session.target}</Text> : null}
      </Text>
      <Text style={styles.panelSub}>{line}</Text>
      <View style={styles.panelAction}>
        <DeckButton
          label={POSE_COPY.tryAgain}
          onPress={canSave ? session.save : session.retry}
          testID={canSave ? 'submit-pose' : 'retry-pose'}
          variant="cameraSolid"
        />
      </View>
      <DeckButton
        label={POSE_COPY.notNow}
        onPress={session.leave}
        testID="pose-not-now"
        variant="quiet"
      />
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#000000',
    },
    stage: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000000',
      overflow: 'hidden',
    },
    fallbackWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageDimmed: {
      opacity: 0.6,
    },
    fallback: {
      color: theme.camera.subtext,
      fontSize: fontSize.sm,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    guide: {
      position: 'absolute',
      alignSelf: 'center',
      top: '18%',
      bottom: '22%',
      width: GUIDE_WIDTH,
      borderWidth: 2.5,
      borderStyle: 'dashed',
      borderColor: theme.camera.guide,
      borderTopLeftRadius: GUIDE_WIDTH / 2,
      borderTopRightRadius: GUIDE_WIDTH / 2,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    guideFits: {
      borderStyle: 'solid',
      borderColor: theme.colors.primary,
    },
    topBar: {
      position: 'absolute',
      left: 18,
      right: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pill: {
      color: theme.camera.text,
      backgroundColor: theme.camera.pill,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      paddingHorizontal: 14,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      overflow: 'hidden',
    },
    topSpacer: {
      width: 40,
    },
    fade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 26,
      paddingHorizontal: 22,
      alignItems: 'center',
      backgroundColor: theme.camera.pill,
    },
    stop: {
      width: 140,
    },
    hint: {
      color: theme.camera.text,
      fontSize: 15.5,
      fontWeight: fontWeight.medium,
      lineHeight: 22,
      textAlign: 'center',
    },
    hintSub: {
      color: theme.camera.subtext,
      fontSize: 13.5,
      textAlign: 'center',
      marginTop: 6,
    },
    panel: {
      position: 'absolute',
      left: 12,
      right: 12,
      borderRadius: 28,
      backgroundColor: theme.camera.panel,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 18,
    },
    panelCount: {
      color: theme.camera.text,
      fontSize: 44,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1.3,
    },
    panelOf: {
      color: theme.camera.subtext,
      fontSize: fontSize.lg,
      letterSpacing: 0,
    },
    panelSub: {
      color: theme.camera.subtext,
      fontSize: fontSize.sm,
      lineHeight: 21,
      marginTop: 6,
    },
    panelAction: {
      marginTop: 20,
    },
    saving: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
  });
