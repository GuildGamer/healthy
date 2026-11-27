import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FRIEND_CHALLENGE_COPY } from '@/components/challenges/constants/friend-challenge';
import { friendChallengeSpec } from '@/components/challenges/friend-challenge';
import { sharePosterParams } from '@/components/challenges/share-poster';
import { useFriendChallenge } from '@/components/challenges/useFriendChallenge';
import { DECK_KIND_GLYPH, DeckDoneFace, DeckEyebrow } from '@/components/deck';
import { healthCategoryName } from '@/constants/health-categories';
import { useTheme } from '@/theme';
import { finishFaceContent } from './finish-face-content';
import { friendSourceForFinish } from './finish-handoff';
import type { FinishedDeckItem } from './types/today-deck';

interface FinishedDeckCardProps {
  item: FinishedDeckItem;
  onNext: () => void;
  /** Keeps the done side up while it offers something, rather than moving on by itself. */
  onHold: () => void;
}

/** A card turned over: what you did, how it was measured, and Share only when it is worth it. */
export function FinishedDeckCard({ item, onNext, onHold }: FinishedDeckCardProps) {
  const router = useRouter();
  const { deckCards } = useTheme();
  const { finish, kind } = item;
  const tone = deckCards.tones[kind];
  const content = finishFaceContent(finish, kind);
  const poster = content.poster;
  const isExtraSet = finish.outcome.kind === 'extraSet';
  const friend = useFriendChallenge({
    spec: friendChallengeSpec(friendSourceForFinish(finish)),
    isEligible: finish.penaltyApplied === 0,
    userChallengeId: isExtraSet ? undefined : finish.challenge.id,
    practice: isExtraSet,
  });

  useEffect(() => {
    if (friend.isOffered) {
      onHold();
    }
  }, [friend.isOffered, onHold]);

  return (
    <DeckDoneFace
      eyebrow={
        <DeckEyebrow
          glyph={DECK_KIND_GLYPH[kind]}
          label={content.eyebrowLabel ?? healthCategoryName(finish.challenge.category)}
          labelColor={deckCards.hasToneRail ? tone : undefined}
        />
      }
      fill={deckCards[kind]}
      headline={content.headline}
      nextLabel={item.nextLabel}
      onNext={onNext}
      onShare={
        poster
          ? () =>
              router.push({
                pathname: '/challenge/share',
                params: { ...sharePosterParams(poster), userChallengeId: finish.challenge.id },
              })
          : null
      }
      proof={content.proof}
      quietAction={
        friend.isOffered
          ? {
              label: FRIEND_CHALLENGE_COPY.action,
              onPress: friend.challengeFriend,
              isBusy: friend.isCreating,
              testID: 'done-face-challenge-friend',
            }
          : null
      }
      railColor={deckCards.hasToneRail ? tone : null}
      testID={`finished-challenge-${finish.challenge.challengeId}`}
    />
  );
}
