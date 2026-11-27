import { act, renderHook } from '@testing-library/react-native';
import { useWalkTimer } from './useWalkTimer';

const START_MS = Date.parse('2026-09-22T09:00:00.000Z');

/** Fake timers move `Date.now()` too, so ticks and wall clock stay in step. */
function walkFor(seconds: number): void {
  act(() => {
    jest.advanceTimersByTime(seconds * 1_000);
  });
}

/** Phone asleep: the wall clock moves on, but no tick is delivered. */
function sleepPhoneFor(seconds: number): void {
  act(() => {
    jest.setSystemTime(Date.now() + seconds * 1_000);
  });
}

describe('useWalkTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START_MS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts seconds while a walk runs', () => {
    const { result } = renderHook(() => useWalkTimer());

    act(() => result.current.resume());
    walkFor(30);

    expect(result.current.elapsedSeconds).toBe(30);
  });

  it('keeps counting across a locked phone, where ticks stall', () => {
    const { result } = renderHook(() => useWalkTimer());

    act(() => result.current.resume());
    sleepPhoneFor(539);
    walkFor(1);

    expect(result.current.elapsedSeconds).toBe(540);
  });

  it('banks the segment on pause and reports the final total', () => {
    const { result } = renderHook(() => useWalkTimer());

    act(() => result.current.resume());
    walkFor(120);

    let paused = 0;
    act(() => {
      paused = result.current.pause();
    });

    expect(paused).toBe(120);
    expect(result.current.elapsedSeconds).toBe(120);
  });

  it('excludes paused time but keeps it when the walk resumes', () => {
    const { result } = renderHook(() => useWalkTimer());

    act(() => result.current.resume());
    walkFor(120);
    act(() => {
      result.current.pause();
    });

    // Two minutes of standing around must not count toward the goal.
    walkFor(120);
    act(() => result.current.resume());
    walkFor(60);

    expect(result.current.elapsedSeconds).toBe(180);
  });

  it('ignores a second resume while already running', () => {
    const { result } = renderHook(() => useWalkTimer());

    act(() => result.current.resume());
    walkFor(10);
    act(() => result.current.resume());
    walkFor(10);

    expect(result.current.elapsedSeconds).toBe(20);
  });

  it('clears banked time on reset', () => {
    const { result } = renderHook(() => useWalkTimer());

    act(() => result.current.resume());
    walkFor(45);
    act(() => result.current.reset());

    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('restores banked time so a reopened walk can continue', () => {
    const { result } = renderHook(() => useWalkTimer());

    act(() => result.current.restore(480));
    expect(result.current.elapsedSeconds).toBe(480);

    act(() => result.current.resume());
    walkFor(60);

    expect(result.current.elapsedSeconds).toBe(540);
  });
});
