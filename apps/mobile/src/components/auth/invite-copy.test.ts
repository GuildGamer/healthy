import {
  inviteDaysLeft,
  inviteDeckCard,
  inviteJoinLine,
  inviteKindLabel,
  invitePrivacyNote,
  inviteRuleHeadline,
} from './invite-copy';

const WALK_TOTAL = { metric: 'walk', scoringMode: 'cumulative_total' } as const;
const PUSHUP_BEST = { metric: 'pushups', scoringMode: 'best_single' } as const;
const WALK_STREAK = { metric: 'walk', scoringMode: 'days_completed' } as const;

describe('invite copy', () => {
  it('names the group by its activity, and a streak by none', () => {
    expect(inviteJoinLine(WALK_TOTAL)).toBe('Make an account to join the walking group.');
    expect(inviteJoinLine(PUSHUP_BEST)).toBe('Make an account to join the push-up group.');
    expect(inviteJoinLine(WALK_STREAK)).toBe('Make an account to join the streak group.');
  });

  it('labels the mode the way Together does', () => {
    expect(inviteKindLabel(WALK_TOTAL)).toBe('Walking total');
    expect(inviteKindLabel(PUSHUP_BEST)).toBe('Push-up best set');
    expect(inviteKindLabel(WALK_STREAK)).toBe('Streak');
  });

  it('states the rule in one line', () => {
    expect(inviteRuleHeadline(WALK_TOTAL)).toBe('Most minutes walked wins.');
    expect(inviteRuleHeadline({ metric: 'pushups', scoringMode: 'cumulative_total' })).toBe(
      'Most push-ups in total wins.',
    );
    expect(inviteRuleHeadline(PUSHUP_BEST)).toBe('Most push-ups in one go wins.');
    expect(inviteRuleHeadline(WALK_STREAK)).toBe('Most days showing up wins.');
  });

  it('counts whole days left, rounding up', () => {
    const now = new Date('2026-10-22T12:00:00Z');

    expect(inviteDaysLeft('2026-10-28T13:00:00Z', now)).toBe('7 days left');
    expect(inviteDaysLeft('2026-10-23T11:00:00Z', now)).toBe('1 day left');
    expect(inviteDaysLeft('2026-10-22T11:00:00Z', now)).toBe('Ends today');
  });

  it('says exactly what others will see', () => {
    expect(invitePrivacyNote(WALK_TOTAL)).toBe(
      'Others see your name and minutes walked. Nothing else.',
    );
    expect(invitePrivacyNote(WALK_STREAK)).toBe(
      'Others see your name and how many days you’ve done. Nothing else.',
    );
  });

  it('deals the group as one Today card', () => {
    const now = new Date('2026-10-22T12:00:00Z');

    expect(inviteDeckCard({ ...WALK_TOTAL, endsAt: '2026-10-28T11:00:00Z' }, now)).toMatchObject({
      kind: 'walk',
      category: 'Walking total',
      when: '6 days left',
      title: 'Most minutes walked wins.',
      proof: 'Walks you already track count',
    });
    expect(inviteDeckCard({ ...WALK_STREAK, endsAt: '2026-10-23T11:00:00Z' }, now)).toMatchObject({
      category: 'Streak',
      when: '1 day left',
      title: 'Most days showing up wins.',
      proof: 'Each day you finish counts',
    });
  });
});
