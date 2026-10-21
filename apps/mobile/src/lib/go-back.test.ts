import { router } from 'expo-router';
import { goBackOrHome } from './go-back';

jest.mock('expo-router', () => ({
  router: {
    canDismiss: jest.fn(),
    dismiss: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

const navigation = router as unknown as {
  canDismiss: jest.Mock<boolean, []>;
  dismiss: jest.Mock<void, []>;
  replace: jest.Mock<void, [string]>;
  back: jest.Mock<void, []>;
};

describe('goBackOrHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dismisses when the stack has a screen underneath', () => {
    navigation.canDismiss.mockReturnValue(true);

    goBackOrHome();

    expect(navigation.dismiss).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(navigation.back).not.toHaveBeenCalled();
  });

  it('replaces home when the stack cannot dismiss', () => {
    navigation.canDismiss.mockReturnValue(false);

    goBackOrHome();

    expect(navigation.replace).toHaveBeenCalledWith('/(tabs)');
    expect(navigation.dismiss).not.toHaveBeenCalled();
    expect(navigation.back).not.toHaveBeenCalled();
  });

  it('replaces the given parent when dismiss is impossible', () => {
    navigation.canDismiss.mockReturnValue(false);

    goBackOrHome('/onboarding');

    expect(navigation.replace).toHaveBeenCalledWith('/onboarding');
    expect(navigation.dismiss).not.toHaveBeenCalled();
    expect(navigation.back).not.toHaveBeenCalled();
  });
});
