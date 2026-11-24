import type { Crew, MatchScoringMode } from '@product/client';
import { MATCH_TITLE_MAX } from '@product/contract/match-board';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { CreatePrefill } from './group-rerun';
import { isOpenStreak } from './group-rule-copy';
import { CREATE_COPY } from './match-copy';
import { type MatchLengthChoice, legalChoiceFor, matchLengthInput } from './match-length';
import {
  MATCH_ANY_DAILY_CHOICE,
  type MatchActivityChoice,
  activityChoiceForMode,
  legalScoringModeFor,
  matchActivityInput,
} from './match-metric';
import type { WhosInSelection } from './WhosInSheet';

function emptyWhosIn(crewId: string | null, participantUserIds: string[]): WhosInSelection {
  return { crewId, participantUserIds };
}

/** Only the host can spend a crew on create. */
function ownedCrews(crews: readonly Crew[]): Crew[] {
  return crews.filter((crew) => crew.isOwner);
}

/**
 * Until the list loads, keep a prefilled id so "Change something" does not drop
 * a crew that was just saved. Once loaded, only an owned row may go on the wire.
 */
function seatableCrewId(
  crewId: string | null,
  owned: readonly Crew[],
  crewsLoaded: boolean,
): string | null {
  if (!crewId) {
    return null;
  }

  if (!crewsLoaded) {
    return crewId;
  }

  return owned.some((crew) => crew.id === crewId) ? crewId : null;
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'NOT_FOUND'
  );
}

/** Everything the start screen chooses, and the one call that starts the group. */
export function useCreateGroup(prefill: CreatePrefill) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activityChoice, setActivityChoice] = useState<MatchActivityChoice>(
    isOpenStreak(prefill) ? MATCH_ANY_DAILY_CHOICE : prefill.metric,
  );
  const [scoringMode, setScoringMode] = useState<MatchScoringMode>(prefill.scoringMode);
  const [length, setLength] = useState<MatchLengthChoice>(prefill.length);
  const [title, setTitle] = useState(prefill.title ?? '');
  const [whosIn, setWhosIn] = useState<WhosInSelection>(() =>
    emptyWhosIn(prefill.crewId, prefill.participantUserIds),
  );
  const crewsQuery = useQuery({ queryKey: ['crews'], queryFn: () => apiClient.listCrews() });
  const peopleQuery = useQuery({
    queryKey: ['crews', 'people'],
    queryFn: () => apiClient.listAcquaintances(),
  });
  const crews = useMemo(
    () => ownedCrews(crewsQuery.data?.crews ?? []),
    [crewsQuery.data?.crews],
  );
  const crewsLoaded = crewsQuery.isFetched;
  const crewId = seatableCrewId(whosIn.crewId, crews, crewsLoaded);
  const { metric, dailyScope } = matchActivityInput(activityChoice, scoringMode);
  const hasSeated = crewId !== null || whosIn.participantUserIds.length > 0;
  const trimmedTitle = title.trim().slice(0, MATCH_TITLE_MAX);

  useEffect(() => {
    if (!crewsLoaded || whosIn.crewId === null) {
      return;
    }

    if (crews.some((crew) => crew.id === whosIn.crewId)) {
      return;
    }

    setWhosIn((current) =>
      current.crewId === null ? current : { ...current, crewId: null },
    );
  }, [crews, crewsLoaded, whosIn.crewId]);

  const create = useMutation({
    mutationFn: () =>
      apiClient.createMatch({
        ...matchLengthInput(length),
        metric,
        scoringMode,
        dailyScope,
        ...(crewId ? { crewId } : {}),
        ...(whosIn.participantUserIds.length > 0
          ? { participantUserIds: whosIn.participantUserIds }
          : {}),
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
        ...(prefill.parentMatchId ? { parentMatchId: prefill.parentMatchId } : {}),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      // Link-first when nobody was seated: open destinations on the board.
      // Seated contests still keep Share on the board for outside joins.
      const shareInvite = !hasSeated ? '1' : undefined;
      router.replace({
        pathname: '/matches/[matchId]',
        params: {
          matchId: result.match.id,
          ...(shareInvite ? { shareInvite } : {}),
        },
      });
    },
    onError: (error) => {
      if (!isNotFoundError(error)) {
        return;
      }

      setWhosIn((current) =>
        current.crewId === null ? current : { ...current, crewId: null },
      );
      void queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });

  function chooseMode(next: MatchScoringMode) {
    // Only a change of mode re-opens the activity, so a host who narrowed a
    // streak does not lose it by picking Streak again.
    if (next !== scoringMode) {
      setActivityChoice((current) => activityChoiceForMode(next, current));
    }

    setScoringMode(next);
    setLength((current) => legalChoiceFor(current, next));
  }

  function chooseActivity(next: MatchActivityChoice) {
    setActivityChoice(next);
    if (next === MATCH_ANY_DAILY_CHOICE) {
      return;
    }

    chooseMode(legalScoringModeFor(next, scoringMode));
  }

  const failureMessage = create.isError
    ? isNotFoundError(create.error)
      ? CREATE_COPY.crewGone
      : CREATE_COPY.failed
    : null;

  return {
    rules: { metric, scoringMode, dailyScope },
    activityChoice,
    length,
    title,
    setTitle,
    whosIn: { ...whosIn, crewId },
    crews,
    people: peopleQuery.data?.people ?? [],
    hasSeated,
    chooseMode,
    chooseActivity,
    chooseLength: setLength,
    chooseWhosIn: setWhosIn,
    start: () => create.mutate(),
    isStarting: create.isPending,
    hasFailed: create.isError,
    failureMessage,
  };
}
