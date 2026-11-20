import {
  MATCH_ANY_DAILY_CHOICE,
  MATCH_ANY_DAILY_LABEL,
  MATCH_DEFAULT_METRIC,
  MATCH_METRIC_LABEL,
  MATCH_STREAK_CTA,
  activityChoiceForMode,
  formatBoardScore,
  legalScoringModeFor,
  matchActivity,
  matchActivityInput,
  matchBoardAction,
} from './match-metric';

describe('formatBoardScore', () => {
  it('formats plank holds as m:ss without a unit', () => {
    expect(formatBoardScore('best_single', 'plank', 92)).toEqual({
      value: '1:32',
      unit: '',
    });
  });

  it('keeps push-up scores as a count with a unit', () => {
    expect(formatBoardScore('best_single', 'pushups', 40)).toEqual({
      value: '40',
      unit: 'push-ups',
    });
  });

  it('keeps streak scores in days', () => {
    expect(formatBoardScore('days_completed', 'plank', 3)).toEqual({
      value: '3',
      unit: 'days',
    });
  });
});

describe('legalScoringModeFor', () => {
  it('keeps a mode the activity can run', () => {
    expect(legalScoringModeFor('walk', 'cumulative_total')).toBe('cumulative_total');
  });

  // Longest single walk would reward one punishing session over regular ones,
  // so walks have no best-set mode to fall back into.
  it('drops best set when the activity is a walk', () => {
    expect(legalScoringModeFor('walk', 'best_single')).toBe('cumulative_total');
  });
});

describe('matchActivity', () => {
  it('names the metric for an attempt-driven contest', () => {
    expect(matchActivity('cumulative_total', 'walk', 'any_challenge').label).toBe(
      MATCH_METRIC_LABEL.walk,
    );
  });

  // An open streak scores any finished daily challenge, so naming one activity
  // would both mislead and leak what the group is managing.
  it('names no activity for an open streak', () => {
    expect(matchActivity('days_completed', 'walk', 'any_challenge').label).toBe(
      MATCH_ANY_DAILY_LABEL,
    );
  });

  it('names the activity a narrowed streak races', () => {
    expect(matchActivity('days_completed', 'walk', 'chosen_activity').label).toBe(
      MATCH_METRIC_LABEL.walk,
    );
  });
});

describe('activityChoiceForMode', () => {
  // Every streak counted everything before a host could narrow one, and that
  // stays the opening position.
  it('opens a streak up to any challenge', () => {
    expect(activityChoiceForMode('days_completed', 'walk')).toBe(MATCH_ANY_DAILY_CHOICE);
  });

  it('keeps the activity when the mode still scores one', () => {
    expect(activityChoiceForMode('cumulative_total', 'walk')).toBe('walk');
  });

  // Nothing else can score "any challenge", so leaving a streak has to land
  // on a real activity rather than send a choice the API would reject.
  it('falls back to an activity when a streak is left', () => {
    expect(activityChoiceForMode('best_single', MATCH_ANY_DAILY_CHOICE)).toBe(MATCH_DEFAULT_METRIC);
  });
});

describe('matchActivityInput', () => {
  it('narrows a streak to the chosen activity', () => {
    expect(matchActivityInput('walk', 'days_completed')).toEqual({
      metric: 'walk',
      dailyScope: 'chosen_activity',
    });
  });

  it('leaves an open streak scoring every challenge', () => {
    expect(matchActivityInput(MATCH_ANY_DAILY_CHOICE, 'days_completed').dailyScope).toBe(
      'any_challenge',
    );
  });

  // Nothing but a streak reads the scope, so an attempt-driven contest must
  // not persist one that suggests it does.
  it('leaves the scope at its default for attempt-driven contests', () => {
    expect(matchActivityInput('walk', 'cumulative_total').dailyScope).toBe('any_challenge');
  });
});

describe('matchBoardAction', () => {
  it('sends a walk contest to the walk session', () => {
    expect(matchBoardAction('cumulative_total', 'walk').session).toBe('walk');
  });

  it('sends a push-up contest to the pose session', () => {
    expect(matchBoardAction('best_single', 'pushups').session).toBe('pose');
  });

  // Attempts are ignored by streak scoring, so offering a session here would
  // send someone off to log something that moves nothing.
  it('leaves the contest for a streak', () => {
    const action = matchBoardAction('days_completed', 'pushups');

    expect(action).toEqual({ label: MATCH_STREAK_CTA, session: null });
  });
});
