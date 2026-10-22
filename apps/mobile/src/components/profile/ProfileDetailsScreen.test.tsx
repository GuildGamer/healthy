import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { ProfileDetailsScreen } from './ProfileDetailsScreen';
import { meFixture, renderWithProviders } from './testing/settings-fixtures';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { me: jest.fn(), updateDisplayName: jest.fn(async () => ({})) },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { name: 'Nurul Masih', image: null } } }),
  updateUser: jest.fn(async () => ({ error: null })),
}));

const mockedApi = jest.mocked(apiClient);

async function renderProfile() {
  mockedApi.me.mockResolvedValue(meFixture());
  renderWithProviders(<ProfileDetailsScreen />);
  await waitFor(() =>
    expect(screen.getByTestId('display-name-input')).toHaveProp('value', 'Nurul'),
  );
}

describe('ProfileDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the full name apart, under Private', async () => {
    await renderProfile();

    expect(screen.getByText('What others see')).toBeOnTheScreen();
    expect(screen.getByText('Private')).toBeOnTheScreen();
    expect(screen.getByText('Nurul Masih')).toBeOnTheScreen();
  });

  it('only offers Save once the name has changed', async () => {
    await renderProfile();
    expect(screen.queryByTestId('display-name-save')).toBeNull();

    fireEvent.changeText(screen.getByTestId('display-name-input'), 'Nurul M.');
    fireEvent.press(screen.getByTestId('display-name-save'));

    await waitFor(() =>
      expect(mockedApi.updateDisplayName).toHaveBeenCalledWith({ displayName: 'Nurul M.' }),
    );
  });

  it('says the rule and keeps Save grey for a name that will not work', async () => {
    await renderProfile();

    fireEvent.changeText(screen.getByTestId('display-name-input'), 'N');

    expect(screen.getByTestId('display-name-error')).toHaveTextContent(
      'Use 2 to 24 letters, numbers, spaces, dots, hyphens or underscores.',
    );
    expect(screen.getByTestId('display-name-save')).toBeDisabled();
    fireEvent.press(screen.getByTestId('display-name-save'));
    expect(mockedApi.updateDisplayName).not.toHaveBeenCalled();
  });
});
