import type { HealthTip } from '@/components/tips';
import {
  liveGroup,
  occurrenceDetail,
  todayChallenge,
  todayDetails,
} from './testing/today-fixtures';
import {
  buildTodayDeck,
  DAY_DONE_KEY,
  latestGroupPresence,
  orderOpenChallenges,
} from './today-deck';

const pushups = {
  kind: 'device_session',
  metric: 'pushups',
  target: { durationMinutes: null, distanceMeters: null, count: 20 },
} as const;

const bpTip: HealthTip = {
  id: 'salt',
  category: 'hypertension',
  title: 'Reduce salt today',
  body: 'Most sodium comes from packaged food.',
};

function deckFor(
  challenges: Parameters<typeof buildTodayDeck>[0]['challenges'],
  overrides: Partial<Parameters<typeof buildTodayDeck>[0]> = {},
) {
  return buildTodayDeck({
    challenges,
    hasMembership: true,
    liveGroups: [],
    todayTip: null,
    details: null,
    ...overrides,
  });
}

describe('orderOpenChallenges', () => {
  it('puts work underway first, then dailies, then the week and month', () => {
    const ordered = orderOpenChallenges([
      todayChallenge({ id: 'weekly', title: 'A weekly', frequency: 'weekly' }),
      todayChallenge({ id: 'daily', title: 'B daily' }),
      todayChallenge({ id: 'underway', title: 'C underway', status: 'in_progress' }),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(['underway', 'daily', 'weekly']);
  });
});

describe('buildTodayDeck', () => {
  it('lists finished cards first in the tally and deals only the open ones', () => {
    const deck = deckFor([
      todayChallenge({ id: 'open', title: 'Open' }),
      todayChallenge({ id: 'done', title: 'Done', status: 'completed', rewardPoints: 150 }),
    ]);

    expect(deck.segments.map((segment) => [segment.id, segment.isDone])).toEqual([
      ['done', true],
      ['open', false],
    ]);
    expect(deck.items.map((item) => item.key)).toEqual(['open']);
    expect(deck.done.map((item) => item.key)).toEqual(['done']);
    expect(deck.pointsToday).toBe(150);
    expect(deck.isDayDone).toBe(false);
  });

  it('numbers each card by its place in the whole day', () => {
    const deck = deckFor([
      todayChallenge({ id: 'done', status: 'completed' }),
      todayChallenge({ id: 'open', capture: pushups }),
    ]);

    const [top] = deck.items;
    expect(top?.type === 'challenge' && top.position).toBe(2);
    expect(top?.type === 'challenge' && top.kind).toBe('strength');
  });

  it('tags week and month cards in place of their position', () => {
    const deck = deckFor([todayChallenge({ id: 'weekly', frequency: 'weekly' })]);

    const [top] = deck.items;
    expect(top?.type === 'challenge' && top.tag).toBe('week');
  });

  it('draws the free win line after two and tags the rest Extra', () => {
    const deck = deckFor(
      [
        todayChallenge({ id: 'a', title: 'A' }),
        todayChallenge({ id: 'b', title: 'B' }),
        todayChallenge({ id: 'c', title: 'C' }),
      ],
      { hasMembership: false },
    );

    expect(deck.winLineAfter).toBe(2);
    expect(deck.items.map((item) => item.type === 'challenge' && item.tag)).toEqual([
      null,
      null,
      'extra',
    ]);
    expect(deck.showsMembershipLine).toBe(false);
  });

  it('has no win line for members or when the list fits the free win', () => {
    expect(
      deckFor([
        todayChallenge({ id: 'a' }),
        todayChallenge({ id: 'b' }),
        todayChallenge({ id: 'c' }),
      ]).winLineAfter,
    ).toBeNull();
    expect(
      deckFor([todayChallenge({ id: 'a' }), todayChallenge({ id: 'b' })], { hasMembership: false })
        .winLineAfter,
    ).toBeNull();
  });

  it('puts the day summary on top once a free win locks, with extras behind it', () => {
    const deck = deckFor(
      [
        todayChallenge({ id: 'a', status: 'completed' }),
        todayChallenge({ id: 'b', status: 'completed' }),
        todayChallenge({ id: 'c' }),
      ],
      { hasMembership: false },
    );

    expect(deck.isDayDone).toBe(true);
    expect(deck.items.map((item) => item.key)).toEqual([DAY_DONE_KEY, 'c']);
    expect(deck.showsMembershipLine).toBe(true);
  });

  it('becomes only the summary when every card is played', () => {
    const deck = deckFor([todayChallenge({ id: 'a', status: 'completed' })]);

    expect(deck.items.map((item) => item.key)).toEqual([DAY_DONE_KEY]);
  });

  it('deals live groups after the challenges', () => {
    const deck = deckFor([todayChallenge({ id: 'a' })], { liveGroups: [liveGroup()] });

    expect(deck.items.map((item) => item.key)).toEqual(['a', 'group-m1']);
  });

  it('rides the tip on the first open card about its condition only', () => {
    const deck = deckFor(
      [
        todayChallenge({ id: 'walk', title: 'A walk', category: 'general' }),
        todayChallenge({ id: 'bp1', title: 'B reading', category: 'hypertension' }),
        todayChallenge({ id: 'bp2', title: 'C reading', category: 'hypertension' }),
      ],
      { todayTip: bpTip },
    );

    const tips = deck.items.map((item) =>
      item.type === 'challenge' ? (item.tip?.id ?? null) : null,
    );
    expect(tips).toEqual([null, 'salt', null]);
  });

  it('fills a segment by how many required fields are in', () => {
    const deck = deckFor([
      todayChallenge({
        id: 'bp',
        completionKind: 'vitals_bp',
        status: 'in_progress',
        progress: { filled: 1, required: 2 },
      }),
    ]);

    expect(deck.segments[0]?.fill).toBe(0.5);
  });

  it('carries each card’s details and fills a counted segment by the best set so far', () => {
    const deck = deckFor([todayChallenge({ id: 'set', capture: pushups })], {
      details: todayDetails([
        occurrenceDetail({ userChallengeId: 'set', bestMeasuredInPeriod: 5 }),
      ]),
    });

    const [top] = deck.items;
    expect(top?.type === 'challenge' && top.detail?.bestMeasuredInPeriod).toBe(5);
    expect(deck.segments[0]?.fill).toBe(0.25);
    expect(deck.weekDayKeys).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ]);
  });

  it('fills a steps card from the phone when nothing has been saved', () => {
    const steps = {
      kind: 'device_session',
      metric: 'steps',
      target: { durationMinutes: null, distanceMeters: null, count: 5_000 },
    } as const;
    const deck = deckFor([todayChallenge({ id: 'steps', capture: steps })], {
      phoneSteps: 1213,
    });

    expect(deck.phoneSteps).toBe(1213);
    expect(deck.segments[0]?.fill).toBe(1213 / 5000);
  });

  it('has no week to draw until the details land', () => {
    expect(deckFor([todayChallenge({ id: 'a' })]).weekDayKeys).toBeNull();
  });
});

describe('latestGroupPresence', () => {
  it('takes the latest move across live groups, said the way each group counts', () => {
    const presence = latestGroupPresence([
      liveGroup({
        id: 'pushups',
        lastMove: { displayName: 'Jess', image: null, movedAt: '2026-10-22T13:56:00.000Z' },
      }),
      liveGroup({
        id: 'days',
        scoringMode: 'days_completed',
        lastMove: { displayName: 'Sam', image: null, movedAt: '2026-10-22T09:00:00.000Z' },
      }),
      liveGroup({ id: 'quiet', lastMove: null }),
    ]);

    expect(presence).toEqual({
      displayName: 'Jess',
      image: null,
      movedAt: '2026-10-22T13:56:00.000Z',
      activity: 'did a set',
    });
    expect(latestGroupPresence([liveGroup()])).toBeNull();
  });
});
