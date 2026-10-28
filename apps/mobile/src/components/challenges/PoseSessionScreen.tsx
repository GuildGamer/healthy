import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useKeepAwake } from 'expo-keep-awake';
import { useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckButton, DeckNavButton } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { QUICKPOSE_SDK_KEY } from '@/lib/config';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { POSE_COPY, SAVE_FAILED_MESSAGE } from './constants/doing-copy';
import { PoseCountHud } from './PoseCountHud';
import { ProofClipActions } from './ProofClipActions';
import { ProofClipAudienceSheet } from './ProofClipAudienceSheet';
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
const GUIDE_TOP = '18%';
/** Fallback until the bottom panel reports its height. */
const GUIDE_BOTTOM_FALLBACK = '28%';
const GUIDE_GAP = 12;

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
  const [panelHeight, setPanelHeight] = useState(0);

  if (session.isLoading) {
    return <ScreenLoader />;
  }

  const isRecording = session.proofStatus === 'recording';

  return (
    <View style={styles.screen} testID="pose-session-screen">
      <PoseCamera session={session} />
      {session.phase === 'setup' ? (
        <BodyGuide fits={session.snapshot.bodyInFrame} panelHeight={panelHeight} />
      ) : null}
      {session.phase === 'counting' ? (
        <PoseCountHud
          count={session.count}
          meta={
            session.finishCountdown != null
              ? POSE_COPY.finishingIn(session.finishCountdown)
              : poseCoachBanner(session.snapshot)
          }
          target={session.target}
        />
      ) : null}
      <PoseTopBar
        isRecording={isRecording}
        label={pillLabel(props, session.target)}
        onClose={session.leave}
      />
      <PoseBottom
        mode={props.mode}
        onPanelLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
        session={session}
      />
      <ProofClipAudienceSheet
        onDismiss={session.closeAudienceSheet}
        onDone={session.confirmAudienceSheet}
        onSelect={session.setProofAudience}
        selected={session.proofAudience}
        visible={session.showAudienceSheet}
      />
    </View>
  );
}

function PoseCamera({ session }: { session: PoseSession }) {
  const styles = useThemedStyles(createStyles);
  const { QuickPoseCamera } = session.camera;
  const keepMountedForProof = session.proofStatus === 'finalizing';
  const isLive =
    (session.phase !== 'review' || keepMountedForProof) &&
    QuickPoseCamera !== null &&
    Boolean(QUICKPOSE_SDK_KEY);

  return (
    <View
      style={[
        styles.stage,
        session.phase === 'review' || keepMountedForProof ? styles.stageDimmed : null,
      ]}
      testID="pose-camera"
    >
      {isLive && QuickPoseCamera ? (
        <QuickPoseCamera
          key={session.cameraSessionKey}
          metric={session.metric}
          finishProofEndAtMs={session.finishProofEndAtMs}
          finishProofToken={session.finishProofToken}
          onProofRecorded={session.handleProofRecorded}
          onProofRecordingError={session.handleProofRecordingError}
          onUpdate={session.handleQuickPoseUpdate}
          proofCount={session.proofCount}
          proofRecording={session.proofRecording}
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
function BodyGuide({ fits, panelHeight }: { fits: boolean; panelHeight: number }) {
  const styles = useThemedStyles(createStyles);
  const bottom = panelHeight > 0 ? panelHeight + GUIDE_GAP : GUIDE_BOTTOM_FALLBACK;

  return (
    <View
      pointerEvents="none"
      style={[styles.guide, { bottom }, fits ? styles.guideFits : null]}
      testID="pose-guide"
    />
  );
}

function PoseTopBar({
  label,
  onClose,
  isRecording,
}: {
  label: string;
  onClose: () => void;
  isRecording: boolean;
}) {
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
      <View style={styles.topCentre}>
        <Text style={styles.pill}>{label}</Text>
        {isRecording ? (
          <View style={styles.recPill} testID="proof-recording-dot">
            <View style={styles.recordingDot} />
            <Text style={styles.recLabel}>{POSE_COPY.proofRecording}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.topSpacer} />
    </View>
  );
}

function PoseBottom({
  session,
  mode,
  onPanelLayout,
}: {
  session: PoseSession;
  mode: PoseSessionProps['mode'];
  onPanelLayout: (event: LayoutChangeEvent) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, spacing.md) + spacing.md;

  if (session.phase === 'review') {
    return (
      <View
        onLayout={onPanelLayout}
        style={[styles.panel, { bottom: paddingBottom }]}
        testID="pose-review"
      >
        <PoseReview mode={mode} session={session} />
      </View>
    );
  }

  return (
    <View onLayout={onPanelLayout} style={[styles.fade, { paddingBottom }]}>
      {session.phase === 'counting' ? (
        <View style={styles.stop}>
          <DeckButton
            label={session.finishCountdown != null ? POSE_COPY.keepGoing : POSE_COPY.stop}
            onPress={
              session.finishCountdown != null ? session.keepGoing : session.stopCounting
            }
            testID={session.finishCountdown != null ? 'keep-going-pose' : 'stop-pose'}
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
      {session.canRecordProof ? (
        <>
          <View style={styles.setupDivider} />
          <ProofClipRow session={session} />
        </>
      ) : null}
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

function ProofClipRow({ session }: { session: PoseSession }) {
  const { camera, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isOn = session.recordProof;
  const audienceNote =
    session.proofAudience === 'only_me' ? POSE_COPY.proofOnlyMeNote : POSE_COPY.proofAnyoneNote;

  return (
    <View style={styles.proofRow} testID="proof-record-chip">
      <View style={styles.proofGlyph}>
        <View style={[styles.proofGlyphDot, isOn ? styles.proofGlyphDotOn : null]} />
      </View>
      <View style={styles.proofText}>
        <Text style={styles.proofTitle}>{POSE_COPY.proofClip}</Text>
        {isOn ? (
          <Pressable
            accessibilityRole="button"
            onPress={session.openAudienceSheet}
            testID="proof-audience-note"
          >
            <Text style={styles.proofNote}>{audienceNote}</Text>
          </Pressable>
        ) : (
          <Text style={styles.proofNote}>
            {session.showProofExplainer ? POSE_COPY.proofHint : POSE_COPY.proofClipNote}
          </Text>
        )}
      </View>
      <Switch
        accessibilityLabel={POSE_COPY.proofClip}
        onValueChange={(next) => session.toggleRecordProof(next)}
        testID="toggle-proof-record"
        thumbColor={camera.text}
        trackColor={{ false: colors.tickIdle, true: colors.accent }}
        value={isOn}
      />
    </View>
  );
}

function PoseReview({ session, mode }: { session: PoseSession; mode: PoseSessionProps['mode'] }) {
  const { camera } = useTheme();
  const styles = useThemedStyles(createStyles);
  const count = session.count;
  const finalizing = session.proofStatus === 'finalizing';

  if (session.isSaving || finalizing) {
    return (
      <View style={styles.saving}>
        <ActivityIndicator color={camera.text} />
        <Text style={styles.panelSub}>
          {finalizing ? POSE_COPY.savingProof : POSE_COPY.saving}
        </Text>
      </View>
    );
  }

  const canSave = session.meetsTarget;
  const line = canSave
    ? SAVE_FAILED_MESSAGE
    : session.target > 0
      ? poseShortLine({ count, target: session.target })
      : poseReviewTitle({ mode, count, meetsTarget: false });
  const showProof =
    !canSave && (Boolean(session.proofClipId) || session.proofFailed);

  return (
    <>
      <Text style={styles.panelCount}>
        {count}
        {session.target > 0 ? <Text style={styles.panelOf}> of {session.target}</Text> : null}
      </Text>
      <Text style={styles.panelSub}>{line}</Text>
      {showProof ? (
        <ProofClipActions
          audience={session.proofAudience}
          clipId={session.proofClipId}
          failed={session.proofFailed && !session.proofClipId}
          isGroup={mode === 'match'}
        />
      ) : null}
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
    proofRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'stretch',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    proofGlyph: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.camera.pill,
    },
    proofGlyphDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.camera.subtext,
    },
    proofGlyphDotOn: {
      backgroundColor: '#E5484D',
    },
    proofText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    proofTitle: {
      color: theme.camera.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    proofNote: {
      color: theme.camera.subtext,
      fontSize: fontSize.xs,
      lineHeight: 16,
    },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#E5484D',
    },
    guide: {
      position: 'absolute',
      alignSelf: 'center',
      top: GUIDE_TOP,
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
    topCentre: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
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
    recPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.camera.pill,
      paddingHorizontal: 10,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
    },
    recLabel: {
      color: theme.camera.text,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
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
    setupDivider: {
      alignSelf: 'stretch',
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.camera.subtext,
      opacity: 0.35,
      marginVertical: spacing.md,
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
