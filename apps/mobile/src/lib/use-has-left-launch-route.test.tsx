import { act, screen } from '@testing-library/react-native';
import { Redirect, Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { useHasLeftLaunchRoute } from './use-has-left-launch-route';

function LaunchLayout() {
  const hasLeftLaunchRoute = useHasLeftLaunchRoute();

  return (
    <>
      <Text testID="launch-state">{hasLeftLaunchRoute ? 'left' : 'launching'}</Text>
      <Slot />
    </>
  );
}

const SCREENS = {
  '(tabs)/_layout': () => <Slot />,
  '(tabs)/index': () => <Text>Today</Text>,
  '(auth)/onboarding': () => <Text>Welcome to Healthy</Text>,
};

async function renderLaunch(index: () => React.JSX.Element) {
  renderRouter({ _layout: LaunchLayout, index, ...SCREENS });
  await act(async () => undefined);
  return screen.getByTestId('launch-state');
}

describe('useHasLeftLaunchRoute', () => {
  it('waits while the launch route is still deciding', async () => {
    const launchState = await renderLaunch(() => <Text>Loading</Text>);

    expect(launchState).toHaveTextContent('launching');
  });

  it('releases on Today, whose pathname is also /', async () => {
    const launchState = await renderLaunch(() => <Redirect href="/(tabs)" />);

    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(launchState).toHaveTextContent('left');
  });

  it('releases on the signed-out welcome', async () => {
    const launchState = await renderLaunch(() => <Redirect href="/onboarding" />);

    expect(launchState).toHaveTextContent('left');
  });
});
