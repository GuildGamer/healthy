import { groupRecapContent } from './group-recap';
import { liveBoard, standing } from './testing/match-fixtures';

const DAY_MS = 86_400_000;
const startsAt = new Date('2026-10-12T09:00:00.000Z');

function finished(overrides: Parameters<typeof liveBoard>[0]) {
  return liveBoard({
    status: 'completed',
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 7 * DAY_MS).toISOString(),
    participantCount: 5,
    ...overrides,
  });
}

describe('groupRecapContent', () => {
  it('leads with your place and names nobody else', () => {
    const content = groupRecapContent(
      finished({
        winnerUserId: 'me',
        standings: [
          standing({ userId: 'me', displayName: 'Nurul', isYou: true, rank: 1, score: 140 }),
          standing({ userId: 'ada', displayName: 'Ada', rank: 2, score: 131 }),
        ],
      }),
    );

    expect(content).toEqual({
      kind: 'Walking total',
      length: '7 days',
      headline: 'You won.',
      hero: { value: '1st', unit: 'of 5 in the group' },
      facts: [
        { label: 'Your score', value: '140 minutes' },
        { label: 'Length', value: '7 days' },
      ],
      claim: 'Every minute sensor-measured',
    });
    expect(JSON.stringify(content)).not.toContain('Ada');
  });

  it('claims nothing measured for a streak, which counts any finished day', () => {
    const content = groupRecapContent(
      finished({
        scoringMode: 'days_completed',
        winnerUserId: 'ada',
        standings: [
          standing({ userId: 'ada', rank: 1, score: 6 }),
          standing({ userId: 'me', isYou: true, rank: 2, score: 5 }),
        ],
      }),
    );

    expect(content.kind).toBe('Streak');
    expect(content.headline).toBe('You came 2nd.');
    expect(content.claim).toBeNull();
  });
});
