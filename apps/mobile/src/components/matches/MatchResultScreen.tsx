import type { MatchBoard } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckNoteCard,
  DeckPageNav,
  DeckSheetMessage,
  DeckSheetModal,
  DeckSheetTitle,
} from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { TextField } from '@/components/forms/TextField';
import { useShareDay } from '@/components/home/useShareDay';
import { ProfilePhotoPreviewModal } from '@/components/profile/ProfilePhotoPreviewModal';
import { apiClient } from '@/lib/api';
import { markMatchResultSeen } from '@/lib/seen-match-results';
import { type Theme, useThemedStyles } from '@/theme';
import { SheetDone } from './CreateRuleSheets';
import { GroupPage } from './GroupPage';
import { GroupPodium } from './GroupPodium';
import { GROUP_RECAP_CARD_WIDTH, GroupRecapCard } from './GroupRecapCard';
import { GroupStandings } from './GroupStandings';
import { resultShareLine, resultSummary } from './group-history';
import { BOARD_COPY, GROUPS_COPY, RESULT_COPY } from './match-copy';
import { RunItBackSheet } from './RunItBackSheet';
import { useRunItBack } from './useRunItBack';

const PODIUM_PLACES = 3;
/** Keep in sync with `CREW_NAME_MAX` in `@product/contract`. */
const CREW_NAME_MAX = 40;

/** Plays once, the first time a finished group is opened. Closing it leaves the board as the record. */
export function MatchResultScreen({ matchId }: { matchId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const matchQuery = useQuery({
    queryKey: ['matches', 'detail', matchId],
    queryFn: () => apiClient.getMatch({ matchId }),
  });

  useEffect(() => {
    void markMatchResultSeen(matchId).then(() =>
      queryClient.setQueryData(['matches', 'result-seen', matchId], true),
    );
  }, [matchId, queryClient]);

  const close = () => router.replace(`/matches/${matchId}`);

  if (matchQuery.isPending) {
    return <ScreenLoader testID="match-result-loading" />;
  }

  if (!matchQuery.data) {
    return (
      <GroupPage nav={<DeckPageNav isClose onBack={close} />} testID="match-result-missing">
        <DeckNoteCard
          action={{ label: GROUPS_COPY.tryAgain, onPress: () => void matchQuery.refetch() }}
          body={GROUPS_COPY.loadFailedBody}
          glyph="offline"
          title={BOARD_COPY.loadFailedTitle}
        />
      </GroupPage>
    );
  }

  return <ResultMoment board={matchQuery.data} onClose={close} />;
}

function ResultMoment({ board, onClose }: { board: MatchBoard; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const rerun = useRunItBack(board);
  const recap = useShareDay(resultShareLine(board), RESULT_COPY.shareDialog);
  const [isRerunOpen, setIsRerunOpen] = useState(false);
  const [isNameCrewOpen, setIsNameCrewOpen] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const summary = resultSummary(board);
  const hasPodium = board.winnerUserId !== null;

  return (
    <>
      <GroupPage
        dock={
          <ResultDock
            canSaveCrew={board.canSaveCrew}
            hasCrewSaveFailed={rerun.hasCrewSaveFailed}
            isCrewSaved={rerun.isCrewSaved}
            onNameAndSave={() => setIsNameCrewOpen(true)}
            onRunItBack={() => setIsRerunOpen(true)}
            onSaveCrew={() => rerun.saveCrew()}
            isSharing={recap.isSharing}
            onShare={() => void recap.share()}
          />
        }
        nav={<DeckPageNav isClose onBack={onClose} />}
        testID="match-result-screen"
      >
        <View style={styles.head}>
          <Text style={styles.lengthLine}>{summary.lengthLine}</Text>
          <Text accessibilityRole="header" style={styles.headline} testID="match-result-headline">
            {summary.headline}
          </Text>
          {summary.sentence ? <Text style={styles.sentence}>{summary.sentence}</Text> : null}
        </View>
        {hasPodium ? <GroupPodium rules={board} standings={board.standings} /> : null}
        <GroupStandings
          hasTitle={false}
          onPreviewPhoto={setPreviewUri}
          rules={board}
          skipTop={hasPodium ? PODIUM_PLACES : 0}
          standings={board.standings}
        />
      </GroupPage>
      <RunItBackSheet
        board={board}
        hasFailed={rerun.hasRerunFailed}
        isBusy={rerun.isBusy}
        onChange={rerun.change}
        onClose={() => setIsRerunOpen(false)}
        onStart={rerun.start}
        visible={isRerunOpen}
      />
      <DeckSheetModal
        footer={
          <>
            <DeckButton
              disabled={crewName.trim().length === 0}
              label={RESULT_COPY.saveCrew}
              onPress={() => {
                rerun.saveCrew(crewName);
                setIsNameCrewOpen(false);
                setCrewName('');
              }}
              testID="match-name-crew-save"
            />
            <SheetDone onClose={() => setIsNameCrewOpen(false)} />
          </>
        }
        onDismiss={() => setIsNameCrewOpen(false)}
        testID="match-name-crew-sheet"
        visible={isNameCrewOpen}
      >
        <DeckSheetTitle>{RESULT_COPY.nameAndSaveCrew}</DeckSheetTitle>
        <TextField
          maxLength={CREW_NAME_MAX}
          onChangeText={setCrewName}
          placeholder={RESULT_COPY.crewNamePlaceholder}
          testID="match-name-crew-input"
          value={crewName}
        />
      </DeckSheetModal>
      {previewUri ? (
        <ProfilePhotoPreviewModal
          imageUri={previewUri}
          onClose={() => setPreviewUri(null)}
          visible
        />
      ) : null}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.offscreenShot}
      >
        <View collapsable={false} ref={recap.shotRef}>
          <GroupRecapCard board={board} />
        </View>
      </View>
    </>
  );
}

function ResultDock({
  canSaveCrew,
  isCrewSaved,
  hasCrewSaveFailed,
  isSharing,
  onRunItBack,
  onSaveCrew,
  onNameAndSave,
  onShare,
}: {
  canSaveCrew: boolean;
  isCrewSaved: boolean;
  hasCrewSaveFailed: boolean;
  isSharing: boolean;
  onRunItBack: () => void;
  onSaveCrew: () => void;
  onNameAndSave: () => void;
  onShare: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <>
      {hasCrewSaveFailed ? <DeckSheetMessage message={RESULT_COPY.crewSaveFailed} /> : null}
      <DeckButton
        glyph="repeat"
        label={RESULT_COPY.runItBack}
        onPress={onRunItBack}
        testID="match-run-it-back"
      />
      <View style={styles.quietRow}>
        {canSaveCrew ? (
          <DeckButton
            disabled={isCrewSaved}
            glyph={isCrewSaved ? 'check' : 'bookmark'}
            isFlexible
            label={isCrewSaved ? RESULT_COPY.crewSaved : RESULT_COPY.saveCrew}
            onPress={onSaveCrew}
            testID="match-save-crew"
            variant="tonal"
          />
        ) : null}
        <DeckButton
          glyph="share"
          isFlexible
          label={RESULT_COPY.share}
          loading={isSharing}
          onPress={onShare}
          testID="match-result-share"
          variant="tonal"
        />
      </View>
      {canSaveCrew && !isCrewSaved ? (
        <DeckButton
          label={RESULT_COPY.nameAndSaveCrew}
          onPress={onNameAndSave}
          testID="match-name-save-crew"
          variant="quiet"
        />
      ) : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    head: {
      alignItems: 'center',
      marginTop: 20,
    },
    lengthLine: {
      color: theme.colors.muted,
      fontSize: 14.5,
    },
    headline: {
      color: theme.colors.text,
      fontSize: 38,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1,
      lineHeight: 44,
      marginTop: spacing.sm,
    },
    sentence: {
      color: theme.colors.muted,
      fontSize: fontSize.sm + 0.5,
      lineHeight: 21,
      marginTop: 6,
      textAlign: 'center',
    },
    quietRow: {
      flexDirection: 'row',
      gap: 10,
    },
    /** Laid out off the page so it can be captured; `opacity: 0` would capture blank. */
    offscreenShot: {
      position: 'absolute',
      top: 0,
      left: -GROUP_RECAP_CARD_WIDTH * 4,
      width: GROUP_RECAP_CARD_WIDTH,
    },
  });
