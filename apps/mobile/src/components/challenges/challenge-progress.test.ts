import { challengeProgress } from './challenge-progress';

describe('challengeProgress', () => {
  it('leaves an empty ring when nothing is filled', () => {
    expect(challengeProgress('pending', { filled: 0, required: 2 })).toEqual({
      kind: 'idle',
    });
  });

  it('marks a completed challenge as done', () => {
    expect(challengeProgress('completed', { filled: 1, required: 1 })).toEqual({
      kind: 'done',
    });
  });

  it('shows filled required fields on an in-progress log', () => {
    expect(challengeProgress('in_progress', { filled: 1, required: 2 })).toEqual(
      {
        kind: 'step',
        step: 1,
        total: 2,
      },
    );
  });
});
