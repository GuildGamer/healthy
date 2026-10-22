import type { MatchBoard } from '@product/client';
import { DeckButton } from '@/components/deck';
import type { GlyphName } from '@/components/icons';
import { BOARD_COPY } from './match-copy';
import { type MatchSessionRoute, matchBoardAction } from './match-metric';

const SESSION_GLYPH: Record<MatchSessionRoute, GlyphName> = {
  walk: 'walk',
  pose: 'strength',
};

interface BoardDockProps {
  match: MatchBoard;
  isWaiting: boolean;
  onAct: (session: MatchSessionRoute | null) => void;
  onShare: () => void;
  onSeeResult: () => void;
}

/**
 * What this group needs from you. While nobody else is in, that is the link;
 * playing stays beside it, quieter, because your score counts from now.
 */
export function BoardDock({ match, isWaiting, onAct, onShare, onSeeResult }: BoardDockProps) {
  if (match.status === 'completed') {
    return (
      <DeckButton
        label={BOARD_COPY.seeResult}
        onPress={onSeeResult}
        testID="match-see-result"
        variant="tonal"
      />
    );
  }

  const action = matchBoardAction(match.scoringMode, match.metric);
  const actButton = (
    <DeckButton
      glyph={action.session ? SESSION_GLYPH[action.session] : undefined}
      label={action.label}
      onPress={() => onAct(action.session)}
      testID="match-do-set"
      variant={isWaiting ? 'tonal' : 'primary'}
    />
  );

  if (!isWaiting) {
    return actButton;
  }

  return (
    <>
      <DeckButton
        glyph="share"
        label={BOARD_COPY.shareLink}
        onPress={onShare}
        testID="match-share-link"
      />
      {actButton}
    </>
  );
}
