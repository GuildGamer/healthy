import type { PublicMatchInvitePreview } from '@product/contract';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { updateUser } from '@/lib/auth-client';
import { TwoQuickThingsScreen } from './TwoQuickThingsScreen';

jest.mock('@/lib/api', () => ({
  apiClient: {
    updateDisplayName: jest.fn(),
    updateCountry: jest.fn(),
  },
}));

jest.mock('@/lib/auth-client', () => ({
  updateUser: jest.fn(),
}));

jest.mock('@/lib/country', () => ({
  ...jest.requireActual('@/lib/country'),
  deviceCountryCode: () => 'NG',
}));

const mockedUpdateUser = updateUser as unknown as jest.Mock;
const mockedUpdateDisplayName = apiClient.updateDisplayName as unknown as jest.Mock;
const mockedUpdateCountry = apiClient.updateCountry as unknown as jest.Mock;

const invite = {
  hostDisplayName: 'Ada',
  metric: 'walk',
} as PublicMatchInvitePreview;

describe('TwoQuickThingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateUser.mockResolvedValue({ error: null });
    mockedUpdateDisplayName.mockResolvedValue({});
    mockedUpdateCountry.mockResolvedValue({});
  });

  it('saves the name on the account and profile, then the country from the phone', async () => {
    const onCompleted = jest.fn();
    render(<TwoQuickThingsScreen accountName="" invite={null} onCompleted={onCompleted} />);

    fireEvent.changeText(screen.getByTestId('complete-country-name'), 'Nurul');
    fireEvent.press(screen.getByTestId('complete-country-continue'));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });
    expect(mockedUpdateUser).toHaveBeenCalledWith({ name: 'Nurul' });
    expect(mockedUpdateDisplayName).toHaveBeenCalledWith({ displayName: 'Nurul' });
    expect(mockedUpdateCountry).toHaveBeenCalledWith({ countryCode: 'NG' });
  });

  it('suggests only the first name from Google and keeps the full name private', async () => {
    const onCompleted = jest.fn();
    render(
      <TwoQuickThingsScreen accountName="Nurul Masih" invite={null} onCompleted={onCompleted} />,
    );

    expect(screen.getByTestId('complete-country-name').props.value).toBe('Nurul');
    fireEvent.press(screen.getByTestId('complete-country-continue'));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });
    expect(mockedUpdateUser).not.toHaveBeenCalled();
    expect(mockedUpdateDisplayName).toHaveBeenCalledWith({ displayName: 'Nurul' });
  });

  it('flags a symbol straight away with the rule', () => {
    render(<TwoQuickThingsScreen accountName="" invite={null} onCompleted={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('complete-country-name'), 'Nu@');

    expect(
      screen.getByText('Use 2 to 24 letters, numbers, spaces, dots, hyphens or underscores.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('complete-country-continue')).toBeDisabled();
  });

  it('asks only for the name when arriving from a group link', async () => {
    const onCompleted = jest.fn();
    render(<TwoQuickThingsScreen accountName="" invite={invite} onCompleted={onCompleted} />);

    expect(screen.getByText('What should Ada’s group call you?')).toBeOnTheScreen();
    expect(screen.queryByTestId('complete-country-picker')).toBeNull();

    fireEvent.changeText(screen.getByTestId('complete-country-name'), 'Nurul');
    fireEvent.press(screen.getByTestId('complete-country-continue'));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });
    expect(mockedUpdateCountry).not.toHaveBeenCalled();
  });
});
