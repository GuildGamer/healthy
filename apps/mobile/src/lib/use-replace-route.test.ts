import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useReplaceRoute } from './use-replace-route';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

const navigation = router as unknown as {
  replace: jest.Mock<void, [string]>;
};

describe('useReplaceRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces when an href is set', () => {
    renderHook(() => useReplaceRoute('/challenge/c1/verify'));

    expect(navigation.replace).toHaveBeenCalledWith('/challenge/c1/verify');
  });

  it('does nothing when href is null', () => {
    renderHook(() => useReplaceRoute(null));

    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
