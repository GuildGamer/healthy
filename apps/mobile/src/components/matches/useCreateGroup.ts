import type { MatchScoringMode } from '@product/client';
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

/** Everything the start screen chooses, and the one call that starts the group. */
export function useCreateGroup(prefill: CreatePrefill) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activityChoice, setActivityChoice] = useState<MatchActivityChoice>(
    isOpenStreak(prefill) ? MATCH_ANY_DAILY_CHOICE : prefill.metric,
  );
  const [scoringMode, setScoringMode] = useState<MatchScoringMode>(prefill.scoringMode);
  const [length, setLength] = useState<MatchLengthChoice>(prefill.length);
  const [crewId, setCrewId] = useState<string | null>(prefill.crewId);
  const crewsQuery = useQuery({ queryKey: ['crews'], queryFn: () => apiClient.listCrews() });
  const { metric, dailyScope } = matchActivityInput(activityChoice, scoringMode);

  const create = useMutation({
    mutationFn: () =>
      apiClient.createMatch({
        ...matchLengthInput(length),
        metric,
        scoringMode,
        dailyScope,
        ...(crewId ? { crewId } : {}),
        ...(prefill.parentMatchId ? { parentMatchId: prefill.parentMatchId } : {}),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      // A crew is already seated, so there is no link to hand anyone.
      if (!crewId) {
        await shareMatchLink(result.match.inviteUrl);
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
    crewId,
    crews: crewsQuery.data?.crews ?? [],
    chooseMode,
    chooseActivity,
    chooseLength: setLength,
    chooseCrew: setCrewId,
    start: () => create.mutate(),
    isStarting: create.isPending,
    hasFailed: create.isError,
  };
}
