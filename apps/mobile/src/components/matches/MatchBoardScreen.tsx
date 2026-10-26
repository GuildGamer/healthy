import type { MatchBoard } from '@product/client';
import { useQuery } from '@tanstack/react-query';
import { type Href, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { DeckNavButton, DeckNoteCard, DeckPageNav, DeckToast } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { ProfilePhotoPreviewModal } from '@/components/profile/ProfilePhotoPreviewModal';
import { goBackOrHome } from '@/lib/go-back';
import { hasSeenMatchResult } from '@/lib/seen-match-results';
import { BoardDock } from './BoardDock';
import { BoardHero } from './BoardHero';
import { BoardOptionsSheet } from './BoardOptionsSheet';
import { GroupPage } from './GroupPage';
import { GroupProofClips } from './GroupProofClips';
import { GroupStandings } from './GroupStandings';
import { GroupTodayStrip } from './GroupTodayStrip';
import { BOARD_COPY, GROUPS_COPY } from './match-copy';
import { NudgeSheet } from './NudgeSheet';
import { shareMatchLink } from './share-match-link';
import { useFaceTaps } from './useFaceTaps';
import { useGroupBoard } from './useGroupBoard';

const BACK_HREF = '/(tabs)/challenges';

/** The first open after a group ends is its result; after that, the board is the record. */
function useIsResultUnseen(match: MatchBoard | undefined): boolean | null {
  const isFinished = match?.status === 'completed';
  const seenQuery = useQuery({
    queryKey: ['matches', 'result-seen', match?.id],
    queryFn: () => hasSeenMatchResult(match?.id ?? ''),
    enabled: isFinished,
  });

  if (!isFinished) {
    return false;
  }

  return seenQuery.data === undefined ? null : !seenQuery.data;
}

export function MatchBoardScreen({ matchId }: { matchId: string }) {
  const { matchQuery, cancel, leave, react } = useGroupBoard(matchId);
  const isResultUnseen = useIsResultUnseen(matchQuery.data);

  if (matchQuery.isPending || isResultUnseen === null) {
    return <ScreenLoader testID="match-board-loading" />;
  }

  if (!matchQuery.data || matchQuery.isError) {
    return (
      <GroupPage
        nav={<DeckPageNav onBack={() => goBackOrHome(BACK_HREF)} />}
        testID="match-board-missing"
      >
        <DeckNoteCard
          action={{ label: GROUPS_COPY.tryAgain, onPress: () => void matchQuery.refetch() }}
          body={GROUPS_COPY.loadFailedBody}
          glyph="offline"
          title={BOARD_COPY.loadFailedTitle}
        />
      </GroupPage>
    );
  }

  if (isResultUnseen) {
    return <Redirect href={`/matches/${matchId}/result`} />;
  }

  return (
    <LiveBoard
      actions={{ cancel, leave, react }}
      match={matchQuery.data}
      onRefresh={() => matchQuery.refetch()}
    />
  );
}

type BoardActions = Pick<ReturnType<typeof useGroupBoard>, 'cancel' | 'leave' | 'react'>;

function LiveBoard({
  match,
  actions,
  onRefresh,
}: {
  match: MatchBoard;
  actions: BoardActions;
  onRefresh: () => Promise<unknown>;
}) {
  const router = useRouter();
  const faces = useFaceTaps(actions.react);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const isOpen = match.status === 'open';
  const isWaiting = isOpen && match.participantCount === 1;
  const canShare = isOpen && match.participantCount < match.participantCap;
  const you = match.standings.find((row) => row.isYou);
  const share = () =>
    void shareMatchLink({
      url: match.inviteUrl,
      hostScore: you?.score ?? match.yourScore,
      hostTitle: match.hostTitle,
      metric: match.metric,
      scoringMode: match.scoringMode,
      endsAt: match.endsAt,
    });

  function stepAway(isHost: boolean) {
    const onError = () =>
      faces.toast.show(isHost ? BOARD_COPY.cancelFailed : BOARD_COPY.leaveFailed);
    if (isHost) {
      actions.cancel.mutate(undefined, { onError });
      return;
    }

    actions.leave.mutate(undefined, { onError });
  }

  function confirmStepAway() {
    setIsOptionsOpen(false);
    const isHost = you?.isHost ?? false;
    Alert.alert(
      isHost ? BOARD_COPY.cancelConfirmTitle : BOARD_COPY.leaveConfirmTitle,
      isHost ? BOARD_COPY.cancelConfirmBody : BOARD_COPY.leaveConfirmBody,
      [
        { text: BOARD_COPY.keep, style: 'cancel' },
        {
          text: isHost ? BOARD_COPY.cancelGroup : BOARD_COPY.leaveGroup,
          style: 'destructive',
          onPress: () => stepAway(isHost),
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <GroupPage
        dock={
          isOpen || match.status === 'completed' ? (
            <BoardDock
              isWaiting={isWaiting}
              match={match}
              onAct={(session) =>
                router.navigate(session ? `/matches/${match.id}/${session}` : BACK_HREF)
              }
              onSeeResult={() => router.push(`/matches/${match.id}/result`)}
              onShare={share}
            />
          ) : undefined
        }
        nav={
          <DeckPageNav
            onBack={() => goBackOrHome(BACK_HREF)}
            right={
              <BoardNavActions
                canShare={canShare}
                isOpen={isOpen}
                onMore={() => setIsOptionsOpen(true)}
                onShare={share}
              />
            }
          />
        }
        onPullRefresh={onRefresh}
        testID="match-board-screen"
      >
        <BoardHero isWaiting={isWaiting} match={match} />
        {isOpen && !isWaiting ? (
          <GroupTodayStrip onTapFace={faces.onTapFace} rules={match} standings={match.standings} />
        ) : null}
        {isWaiting ? null : <GroupProofClips matchId={match.id} />}
        {isWaiting ? null : (
          <GroupStandings
            onPreviewPhoto={setPreviewUri}
            rules={match}
            standings={match.standings}
          />
        )}
      </GroupPage>

      <BoardOptionsSheet
        canShare={canShare}
        isHost={you?.isHost ?? false}
        onClose={() => setIsOptionsOpen(false)}
        onShare={() => {
          setIsOptionsOpen(false);
          share();
        }}
        onVerifyClip={() => {
          setIsOptionsOpen(false);
          router.push('/v/new' as Href);
        }}
        onStepAway={confirmStepAway}
        visible={isOptionsOpen}
      />
      <NudgeSheet
        hasFailed={faces.hasNudgeFailed}
        isSending={faces.isSendingNudge}
        match={match}
        onClose={faces.closeNudge}
        onSend={faces.sendNudge}
        senderName={you?.displayName ?? BOARD_COPY.you}
        target={faces.nudgeTarget}
      />
      {previewUri ? (
        <ProfilePhotoPreviewModal
          imageUri={previewUri}
          onClose={() => setPreviewUri(null)}
          visible
        />
      ) : null}
      {faces.toast.message ? (
        <DeckToast
          message={faces.toast.message}
          onDismiss={faces.toast.hide}
          testID="match-board-toast"
        />
      ) : null}
    </View>
  );
}

function BoardNavActions({
  isOpen,
  canShare,
  onShare,
  onMore,
}: {
  isOpen: boolean;
  canShare: boolean;
  onShare: () => void;
  onMore: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <View style={styles.navActions}>
      {canShare ? (
        <DeckNavButton
          accessibilityLabel={BOARD_COPY.shareLink}
          glyph="share"
          onPage
          onPress={onShare}
          testID="match-nav-share"
        />
      ) : null}
      <DeckNavButton
        accessibilityLabel={BOARD_COPY.more}
        glyph="more"
        onPage
        onPress={onMore}
        testID="match-nav-more"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  navActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
