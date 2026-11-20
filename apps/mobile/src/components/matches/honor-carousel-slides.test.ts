import type { MatchBoard, MatchHonor } from '@product/client';
import { honorCarouselSlides } from './honor-carousel-slides';

function honor(partial: Partial<MatchHonor> & Pick<MatchHonor, 'kind' | 'userId'>): MatchHonor {
  return {
    displayName: partial.displayName ?? 'Ada',
    title: partial.title ?? 'Title',
    proof: partial.proof ?? 'proof',
    shareText: partial.shareText ?? 'share',
    palette: partial.palette ?? partial.kind,
    ...partial,
  };
}

function board(honors: MatchHonor[]): MatchBoard {
  return {
    id: 'm1',
    token: 'tok',
    inviteUrl: 'https://www.gethealthyapp.com/match/tok',
    metric: 'pushups',
    scoringMode: 'cumulative_total',
    dailyScope: 'any_challenge',
    startsAt: '2026-11-01T00:00:00.000Z',
    endsAt: '2026-11-08T00:00:00.000Z',
    status: 'completed',
    participantCount: 4,
    participantCap: 25,
    yourScore: 100,
    yourBestCount: 100,
    winnerUserId: 'ada',
    standings: [
      {
        userId: 'you',
        displayName: 'You',
        rank: 2,
        score: 100,
        bestCount: 100,
        isYou: true,
        isHost: false,
        isPending: false,
      },
      {
        userId: 'ada',
        displayName: 'Ada',
        rank: 1,
        score: 200,
        bestCount: 200,
        isYou: false,
        isHost: true,
        isPending: false,
      },
    ],
    canSaveCrew: false,
    honors,
  };
}

describe('honorCarouselSlides', () => {
  it('opens on the viewer honor then recap then board', () => {
    const slides = honorCarouselSlides(
      board([
        honor({ kind: 'champion', userId: 'ada', title: 'You took the crown.' }),
        honor({ kind: 'comeback', userId: 'you', title: 'Comeback King!' }),
        honor({ kind: 'fastest_set', userId: 'ada', title: 'Fastest set!' }),
      ]),
      'you',
    );

    expect(slides[0]).toMatchObject({ type: 'honor', isYours: true });
    if (slides[0]?.type === 'honor') {
      expect(slides[0].honor.kind).toBe('comeback');
    }
    expect(slides.some((slide) => slide.type === 'recap')).toBe(true);
    expect(slides[slides.length - 1]?.type).toBe('board');
  });

  it('opens on recap when the viewer has no honor', () => {
    const slides = honorCarouselSlides(
      board([honor({ kind: 'champion', userId: 'ada', title: 'You took the crown.' })]),
      'you',
    );

    expect(slides[0]?.type).toBe('recap');
  });
});
