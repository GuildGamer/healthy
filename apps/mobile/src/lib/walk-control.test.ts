import {
  dispatchWalkControlUrl,
  isWalkControlUrl,
  setWalkControlHandler,
  walkControlActionFromUrl,
} from './walk-control';

describe('walkControlActionFromUrl', () => {
  it('reads pause and resume from the healthy scheme', () => {
    expect(walkControlActionFromUrl('healthy://walk-control/pause')).toBe('pause');
    expect(walkControlActionFromUrl('healthy://walk-control/resume')).toBe('resume');
  });

  it('reads the path-only forms Expo Router may pass', () => {
    expect(walkControlActionFromUrl('/walk-control/pause')).toBe('pause');
    expect(walkControlActionFromUrl('walk-control/resume')).toBe('resume');
  });

  it('ignores other links', () => {
    expect(walkControlActionFromUrl('healthy://match/abc')).toBeNull();
    expect(walkControlActionFromUrl('https://example.com/walk-control/pause')).toBeNull();
  });
});

describe('isWalkControlUrl', () => {
  it('is true for control links even before a recorder is attached', () => {
    expect(isWalkControlUrl('healthy://walk-control/pause')).toBe(true);
    expect(isWalkControlUrl('/home')).toBe(false);
  });
});

describe('dispatchWalkControlUrl', () => {
  afterEach(() => {
    setWalkControlHandler(null);
  });

  it('forwards to the registered recorder', () => {
    const pause = jest.fn();
    const resume = jest.fn();
    setWalkControlHandler({ pause, resume });

    expect(dispatchWalkControlUrl('healthy://walk-control/pause')).toBe(true);
    expect(pause).toHaveBeenCalledTimes(1);

    expect(dispatchWalkControlUrl('/walk-control/resume')).toBe(true);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when nothing is recording', () => {
    expect(dispatchWalkControlUrl('healthy://walk-control/pause')).toBe(false);
  });
});
