import type { MatchScoringMode } from '@product/client';
import { MATCH_TITLE_MAX } from '@product/contract/match-board';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { apiClient } from '@/lib/api';
import type { CreatePrefill } from './group-rerun';
import { isOpenStreak } from './group-rule-copy';
import { type MatchLengthChoice, legalChoiceFor, matchLengthInput } from './match-length';
import {
  MATCH_ANY_DAILY_CHOICE,
  type MatchActivityChoice,
  activityChoiceForMode,
  legalScoringModeFor,
  matchActivityInput,
} from './match-metric';
import { shareMatchLink } from './share-match-link';
import type { WhosInSelection } from './WhosInSheet';

function emptyWhosIn(crewId: string | null, participantUserIds: string[]): WhosInSelection {
  return { crewId, participantUserIds };
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
  const { metric, dailyScope } = matchActivityInput(activityChoice, scoringMode);
  const hasSeated =
    whosIn.crewId !== null || whosIn.participantUserIds.length > 0;
  const trimmedTitle = title.trim().slice(0, MATCH_TITLE_MAX);

  const create = useMutation({
    mutationFn: () =>
      apiClient.createMatch({
        ...matchLengthInput(length),
        metric,
        scoringMode,
        dailyScope,
        ...(whosIn.crewId ? { crewId: whosIn.crewId } : {}),
        ...(whosIn.participantUserIds.length > 0
          ? { participantUserIds: whosIn.participantUserIds }
          : {}),
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
        ...(prefill.parentMatchId ? { parentMatchId: prefill.parentMatchId } : {}),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      // Link-first when nobody was seated. Seated contests still keep Share on
      // the board for anyone joining from outside.
      if (!hasSeated) {
        await shareMatchLink({
          url: result.match.inviteUrl,
          hostScore: result.match.yourScore,
          hostTitle: result.match.hostTitle,
          metric: result.match.metric,
          scoringMode: result.match.scoringMode,
          endsAt: result.match.endsAt,
        });
      }
      router.replace(`/matches/${result.match.id}`);
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

  return {
    rules: { metric, scoringMode, dailyScope },
    activityChoice,
    length,
    title,
    setTitle,
    whosIn,
    crews: crewsQuery.data?.crews ?? [],
    people: peopleQuery.data?.people ?? [],
    hasSeated,
    chooseMode,
    chooseActivity,
    chooseLength: setLength,
    chooseWhosIn: setWhosIn,
    start: () => create.mutate(),
    isStarting: create.isPending,
    hasFailed: create.isError,
  };
}
