import { STANDING_NO_SCORE, standingProgress } from './standing-progress';

describe('standingProgress', () => {
  it('fills the bar and stays quiet for the leader', () => {
    expect(standingProgress({ score: 42, leadScore: 42 })).toEqual({
      fraction: 1,
      note: null,
    });
  });

  it('scales the bar to the leader and names the gap', () => {
    expect(standingProgress({ score: 21, leadScore: 42 })).toEqual({
      fraction: 0.5,
      note: '21 behind',
    });
  });

  it('keeps the gap singular when one set apart', () => {
    expect(standingProgress({ score: 41, leadScore: 42 }).note).toBe(
      '1 behind',
    );
  });

  it('empties the bar for anyone yet to score', () => {
    expect(standingProgress({ score: 0, leadScore: 42 })).toEqual({
      fraction: 0,
      note: STANDING_NO_SCORE,
    });
  });

  it('treats an untouched board as nobody behind', () => {
    expect(standingProgress({ score: 0, leadScore: 0 })).toEqual({
      fraction: 0,
      note: STANDING_NO_SCORE,
    });
  });
});
