import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { shareMatchLink } from '@/components/matches/share-match-link';
import { apiClient } from '@/lib/api';
import { trackEvent } from '@/lib/track-event';
import { FRIEND_REFERRAL_EXPERIMENT } from './constants/friend-challenge';
import type { ExperimentArm, FriendChallengeSpec } from './types/friend-challenge';

type FriendChallengeInput = {
  spec: FriendChallengeSpec;
  /** False skips the experiment entirely, as after a penalised finish. */
  isEligible: boolean;
  userChallengeId?: string;
  /** The contest this one follows, when a challenge chains (A → B → C). */
  parentMatchId?: string;
  practice?: boolean;
};

/**
 * Competitive fitness pivot: everyone who is eligible gets "Challenge a friend".
 * The experiment assignment is still fetched for analytics attribution.
 */
export function isFriendChallengeTreatment(
  _assignment: ExperimentArm | null | undefined,
): boolean {
  return true;
}

/**
 * The friend-referral experiment behind "Challenge a friend": the arm, one
 * exposure event when the offer is shown, and the invite it creates and shares.
 */
export function useFriendChallenge(input: FriendChallengeInput) {
  const router = useRouter();
  const exposureTracked = useRef(false);
  const assignmentQuery = useQuery({
    queryKey: ['experiments', FRIEND_REFERRAL_EXPERIMENT],
    queryFn: () => apiClient.getExperimentAssignment({ experimentKey: FRIEND_REFERRAL_EXPERIMENT }),
    enabled: input.isEligible,
  });
  const assignment = assignmentQuery.data;
  const isReady = !input.isEligible || assignmentQuery.isFetched || assignmentQuery.isError;
  const isOffered = input.isEligible && isReady && isFriendChallengeTreatment(assignment);
  const eventContext = {
    experiment_id: assignment?.experimentId,
    experiment_variant: assignment?.variantKey,
    match_id: input.parentMatchId,
    user_challenge_id: input.userChallengeId,
    challenge_goal: input.spec.match.seedCount,
    practice: input.practice ?? false,
  };

  useEffect(() => {
    if (!isOffered || exposureTracked.current) {
      return;
    }

    exposureTracked.current = true;
    trackEvent('challenge_cta_viewed', eventContext);
  });

  const create = useMutation({
    mutationFn: () =>
      apiClient.createMatch({
        ...input.spec.match,
        sourceUserChallengeId: input.userChallengeId,
        parentMatchId: input.parentMatchId,
        experimentId: assignment?.experimentId,
        experimentVariantKey: assignment?.variantKey,
      }),
    onSuccess: async (result) => {
      trackEvent('challenge_created', {
        ...eventContext,
        challenge_id: result.match.id,
        parent_challenge_id: input.parentMatchId,
      });
      trackEvent('challenge_share_sheet_opened', {
        challenge_id: result.match.id,
        practice: eventContext.practice,
      });
      await shareMatchLink({
        url: result.invite.url,
        hostScore: input.spec.match.seedCount ?? result.match.yourScore,
        metric: result.match.metric,
        scoringMode: result.match.scoringMode,
        endsAt: result.match.endsAt,
      });
      router.push(`/matches/${result.match.id}`);
    },
  });

  return {
    isReady,
    isOffered,
    isCreating: create.isPending,
    didFail: create.isError,
    challengeFriend: () => {
      trackEvent('challenge_friend_clicked', eventContext);
      create.mutate();
    },
  };
}
