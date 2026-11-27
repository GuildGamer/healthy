import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import ChallengesTab from '../../../app/(tabs)/challenges';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mockSearchParams: { current: Record<string, string | undefined> } = { current: {} };

jest.mock('expo-router', () => {
  const { Text: MockText } = require('react-native');
  return {
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
    useRouter: () => ({ push: jest.fn() }),
    useLocalSearchParams: () => mockSearchParams.current,
  };
});

jest.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'me' } }, isPending: false }),
}));

jest.mock('@/components/challenges', () => {
  const { Text: MockText } = require('react-native');
  return {
    ChallengesHeader: ({
      segment,
      segments,
    }: {
      segment: string;
      segments: readonly { id: string; label: string }[];
    }) => (
      <MockText testID="tab-meta">{`${segments.map((entry) => entry.id).join(',')}|${segment}`}</MockText>
    ),
    ChallengesScreen: () => <MockText testID="mine-screen">Mine</MockText>,
  };
});

jest.mock('@/components/matches', () => {
  const { Text: MockText } = require('react-native');
  return {
    MatchesListScreen: () => <MockText testID="groups-screen">Groups</MockText>,
  };
});

function renderTab() {
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <ChallengesTab />
    </SafeAreaProvider>,
  );
}

describe('ChallengesTab', () => {
  beforeEach(() => {
    mockSearchParams.current = {};
  });

  it('defaults to Groups, listed first', () => {
    renderTab();

    expect(screen.getByTestId('tab-meta')).toHaveTextContent('groups,mine|groups');
    expect(screen.getByTestId('groups-screen')).toBeOnTheScreen();
  });

  it('opens Mine when the segment param asks for it', () => {
    mockSearchParams.current = { segment: 'mine' };
    renderTab();

    expect(screen.getByTestId('tab-meta')).toHaveTextContent('groups,mine|mine');
    expect(screen.getByTestId('mine-screen')).toBeOnTheScreen();
  });
});
