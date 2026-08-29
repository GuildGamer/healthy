import { act, renderHook } from '@testing-library/react-native';
import { usePullRefresh } from './use-pull-refresh';

describe('usePullRefresh', () => {
  it('stays refreshing until the work finishes', async () => {
    let finish!: () => void;
    const refresh = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });

    const { result } = renderHook(() => usePullRefresh(refresh));

    expect(result.current.isRefreshing).toBe(false);

    let pull!: Promise<void>;
    act(() => {
      pull = result.current.onRefresh();
    });

    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      finish();
      await pull;
    });

    expect(result.current.isRefreshing).toBe(false);
  });
});
