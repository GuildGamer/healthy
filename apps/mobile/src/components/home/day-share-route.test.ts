import { dayShareParams, parseDayShareContent } from './day-share-route';

const content = {
  weekday: 'Thursday',
  dateLabel: '22 October',
  completedCount: 4,
  totalCount: 4,
  pointsToday: 500,
  streakDays: 7,
};

describe('dayShareParams', () => {
  it('round-trips through parseDayShareContent', () => {
    expect(parseDayShareContent(dayShareParams(content))).toEqual(content);
  });

  it('rejects incomplete params', () => {
    expect(parseDayShareContent({ weekday: 'Thursday' })).toBeNull();
    expect(parseDayShareContent({ ...dayShareParams(content), completedCount: 'nope' })).toBeNull();
  });
});
