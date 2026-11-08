import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

jest.unmock('walk-live-activity');

const mockStartActivity = jest.fn((..._args: unknown[]) => 'activity-42');
const mockStopActivity = jest.fn((..._args: unknown[]) => undefined);
const mockUpdateActivity = jest.fn((..._args: unknown[]) => undefined);

jest.mock('expo-live-activity', () => ({
  startActivity: (...args: unknown[]) => mockStartActivity(...args),
  stopActivity: (...args: unknown[]) => mockStopActivity(...args),
  updateActivity: (...args: unknown[]) => mockUpdateActivity(...args),
}));

const appearance = {
  backgroundColor: '#1A2438',
  titleColor: '#F4F7FB',
  subtitleColor: '#9AA8BF',
  progressViewTint: '#3DDC97',
  buttonLabelColor: '#0B1220',
  padding: 20,
};

const copy = {
  title: '05:00',
  body: '1.2 km',
  progress: null as number | null,
  appearance,
};

function setPlatformOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

describe('walk-live-activity orphan cleanup', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setPlatformOs('ios');
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
    jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
  });

  afterEach(() => {
    setPlatformOs(originalOs);
  });

  it('persists the activity id on start and clears it on end', async () => {
    const {
      startWalkLiveActivity,
      endWalkLiveActivity,
    } = require('./index') as typeof import('./index');

    startWalkLiveActivity(copy);

    expect(mockStartActivity).toHaveBeenCalled();
    await waitForSecureStore();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'walk_live_activity_id',
      'activity-42',
    );

    endWalkLiveActivity();
    expect(mockStopActivity).toHaveBeenCalledWith(
      'activity-42',
      expect.objectContaining({ title: '00:00', subtitle: 'Walk ended' }),
    );
    await waitForSecureStore();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('walk_live_activity_id');
  });

  it('stops a persisted orphan id when memory no longer holds the activity', async () => {
    const {
      endWalkLiveActivity,
      clearOrphanWalkLiveActivities,
    } = require('./index') as typeof import('./index');

    // Simulate process death: in-memory id cleared, SecureStore still set.
    endWalkLiveActivity();
    mockStopActivity.mockClear();
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('orphan-9');

    await clearOrphanWalkLiveActivities();

    expect(mockStopActivity).toHaveBeenCalledWith(
      'orphan-9',
      expect.objectContaining({ title: '00:00', subtitle: 'Walk ended' }),
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('walk_live_activity_id');
  });
});

async function waitForSecureStore(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
