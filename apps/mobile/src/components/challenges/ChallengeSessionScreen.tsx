import type { TodayChallenge } from '@product/client';
import { isDeviceCapture } from '@product/contract/challenge-capture';
import { fontSize, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckEyebrow, DeckRoundButton } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { ConnectHealthSheet } from '@/components/health/ConnectHealthSheet';
import { apiClient } from '@/lib/api';
import { formatDistance } from '@/lib/geo-session';
import { type Theme, useThemedStyles } from '@/theme';
import { SAVE_FAILED_MESSAGE, WALK_COPY } from './constants/doing-copy';
import { SessionShell, SessionTitle } from './SessionShell';
import { StepsSession } from './StepsSession';
import { useChallengeTone } from './useChallengeTone';
import { useTodayOccurrence } from './useTodayOccurrence';
import { type WalkSession, type WalkView, useWalkSession } from './useWalkSession';
import { walkGoalLabel, walkHero, walkProgressRatio, walkShortfall } from './walk-session-progress';
import {
  FoundWalkCard,
  LocationOffPanel,
  RouteStrip,
  WalkHero,
  WalkStat,
  WalkTrack,
} from './WalkSessionParts';

function useHealthLinkPrompt(occurrence: TodayChallenge | undefined) {
  const [isVisible, setIsVisible] = useState(false);
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });

  useEffect(() => {
    if (meQuery.data?.healthLinkStatus === 'unknown' && occurrence) {
      setIsVisible(isDeviceCapture(occurrence.capture.kind));
    }
  }, [meQuery.data?.healthLinkStatus, occurrence]);

  return { isVisible, close: () => setIsVisible(false) };
}

/** A measured activity on the whole phone: a recorded walk, or today's steps. */
export function ChallengeSessionScreen({ challengeId }: { challengeId: string }) {
  const { occurrence, isPending } = useTodayOccurrence(challengeId);
  const healthPrompt = useHealthLinkPrompt(occurrence);

  if (isPending || !occurrence) {
    return <ScreenLoader />;
  }

  return (
    <>
      {occurrence.capture.kind === 'device_sample' ? (
        <StepsSession occurrence={occurrence} />
      ) : (
        <WalkSessionScreen occurrence={occurrence} />
      )}
      <ConnectHealthSheet onClose={healthPrompt.close} visible={healthPrompt.isVisible} />
    </>
  );
}

function eyebrowFor(session: WalkSession): string {
  if (session.view === 'short') {
    return WALK_COPY.shortOfGoal;
  }

  if (
    session.view === 'paused' ||
    session.recorder.autoPaused ||
    session.recorder.userPaused
  ) {
    return WALK_COPY.paused;
  }

  if (session.view === 'recording') {
    return session.isGoalMet ? WALK_COPY.goalReached : WALK_COPY.recording;
  }

  return WALK_COPY.movement;
}

function isUnderway(view: WalkView): boolean {
  return view === 'recording' || view === 'paused' || view === 'short';
}

function WalkSessionScreen({ occurrence }: { occurrence: TodayChallenge }) {
  const styles = useThemedStyles(createStyles);
  const session = useWalkSession(occurrence);
  const { fill } = useChallengeTone(occurrence);
  const target = occurrence.capture.target;
  const hero = walkHero(session.progress, target);
  const underway = isUnderway(session.view);

  return (
    <SessionShell
      dock={<WalkDock session={session} />}
      fill={fill}
      onClose={session.leave}
      testID="challenge-session-screen"
    >
      <DeckEyebrow
        corner={underway ? occurrence.title : walkGoalLabel(target)}
        glyph="walk"
        label={eyebrowFor(session)}
      />
      {underway ? null : <SessionTitle>{occurrence.title}</SessionTitle>}
      {session.view === 'locationOff' ? <LocationOffPanel /> : null}
      {session.view === 'ready' && session.foundSample ? (
        <FoundWalkCard
          isBusy={session.isSaving}
          label={session.foundSample.label}
          onUse={() => session.foundSample && session.submitSample(session.foundSample)}
        />
      ) : null}
      {session.view === 'locationOff' ? null : (
        <WalkHero
          isGoalMet={underway && session.isGoalMet}
          isIdle={!underway}
          of={session.view === 'recording' && session.isGoalMet ? WALK_COPY.keepGoing : hero.of}
          value={hero.value}
        />
      )}
      {underway ? (
        <>
          <WalkTrack ratio={walkProgressRatio(session.progress, target) ?? 0} />
          <RouteStrip isRecording={session.view === 'recording'} points={session.recorder.points} />
          <WalkStat
            label={WALK_COPY.distance}
            value={formatDistance(session.progress.distanceMeters)}
          />
        </>
      ) : null}
      {session.view === 'short' ? (
        <Text style={styles.note} testID="session-review">
          {walkShortfall(session.progress, target)}
        </Text>
      ) : null}
    </SessionShell>
  );
}

function WalkDock({ session }: { session: WalkSession }) {
  const styles = useThemedStyles(createStyles);
  const error = session.saveFailed
    ? SAVE_FAILED_MESSAGE
    : session.view === 'locationOff'
      ? null
      : session.recorder.error;

  return (
    <>
      {error ? <Text style={styles.note}>{error}</Text> : null}
      <WalkActions session={session} />
    </>
  );
}

function WalkActions({ session }: { session: WalkSession }) {
  const styles = useThemedStyles(createStyles);
  const byHand = (
    <DeckButton
      label={WALK_COPY.byHand}
      onPress={session.logByHand}
      testID="confirm-challenge"
      variant="quiet"
    />
  );

  if (session.view === 'ready') {
    return (
      <>
        <DeckButton
          glyph="play"
          label={WALK_COPY.startWalk}
          loading={session.isStarting}
          onPress={session.start}
          testID="start-session"
        />
        {byHand}
      </>
    );
  }

  if (session.view === 'locationOff') {
    return (
      <>
        <DeckButton
          label={WALK_COPY.openSettings}
          onPress={() => void Linking.openSettings()}
          testID="session-open-settings"
        />
        {byHand}
      </>
    );
  }

  if (session.view === 'short') {
    return (
      <>
        <DeckButton
          label={WALK_COPY.keepWalking}
          onPress={session.resume}
          testID="resume-session"
        />
        {byHand}
      </>
    );
  }

  const isRecording = session.view === 'recording';
  const userPaused = session.recorder.userPaused;
  // Soft pause from the lock-screen card keeps the session recording; bank
  // pause is the in-app Pause while the clock is still running.
  const showResume = !isRecording || userPaused;
  const onPauseOrResume = userPaused
    ? session.recorder.resume
    : isRecording
      ? session.pause
      : session.resume;

  return (
    <View style={styles.row}>
      <DeckRoundButton
        accessibilityLabel={showResume ? WALK_COPY.resume : WALK_COPY.pause}
        glyph={showResume ? 'play' : 'pause'}
        onPress={onPauseOrResume}
        testID={showResume ? 'resume-session' : 'pause-session'}
      />
      <DeckButton
        isFlexible
        label={session.isGoalMet ? WALK_COPY.finishWalk : WALK_COPY.finish}
        loading={session.isSaving}
        onPress={session.finish}
        testID="stop-session"
        variant={session.isGoalMet ? 'primary' : 'tonal'}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    note: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      lineHeight: 20,
      marginTop: spacing.md,
    },
  });
