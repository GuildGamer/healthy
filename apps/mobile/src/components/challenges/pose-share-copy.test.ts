import { poseShareCopy } from './pose-share-copy';

describe('poseShareCopy', () => {
  it('names every pose metric from the shared maps', () => {
    expect(poseShareCopy('squats')).toEqual({
      metric: 'squats',
      label: 'Squats',
      unit: 'squats',
      countedUnit: 'squats, counted by camera',
    });
    expect(poseShareCopy('plank')).toMatchObject({
      label: 'Plank',
      unit: 'seconds',
      countedUnit: 'seconds, counted by camera',
    });
    expect(poseShareCopy('pushups').unit).toBe('push-ups');
  });

  it('falls back to push-ups when the metric is missing', () => {
    expect(poseShareCopy(null).metric).toBe('pushups');
    expect(poseShareCopy('walk').metric).toBe('pushups');
  });
});
