import { posterForSuccess } from './success-poster';

const when = new Date(2026, 9, 22, 9, 15);

describe('posterForSuccess', () => {
  it('heroes a set, a walk and a glass, and keeps a reading quiet', () => {
    expect(
      posterForSuccess({ title: 'Do 20 push-ups', face: 'reps', count: 22, when }),
    ).toMatchObject({ kind: 'strength', value: '22', unit: 'push-ups' });

    expect(
      posterForSuccess({ title: 'Morning walk', face: 'minutes', minutes: 20, when }),
    ).toMatchObject({ kind: 'walk', value: '20', unit: 'minutes walked' });

    expect(
      posterForSuccess({ title: 'Log your water', face: 'glasses', glasses: 6, when }),
    ).toMatchObject({ kind: 'water', value: '6', unit: 'glasses' });

    const reading = posterForSuccess({
      title: 'Check your blood pressure',
      face: 'logged',
      when,
    });
    expect(reading).toMatchObject({ value: 'Logged', label: 'Check your blood pressure' });
    expect(JSON.stringify(reading)).not.toMatch(/128|82/);

    expect(
      posterForSuccess({ title: 'Take your preventer inhaler', face: 'done', when }),
    ).toMatchObject({ value: 'Done', unit: '22 Oct' });
  });
});
