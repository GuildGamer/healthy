import { ensureWalkLocationTaskStopped, WALK_LOCATION_TASK } from './walk-background-location';

const mockHasStartedLocationUpdatesAsync = jest.fn();
const mockStopLocationUpdatesAsync = jest.fn();

jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: (...args: unknown[]) =>
    mockHasStartedLocationUpdatesAsync(...args),
  stopLocationUpdatesAsync: (...args: unknown[]) => mockStopLocationUpdatesAsync(...args),
}));

describe('ensureWalkLocationTaskStopped', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stops the walk task when a previous process left it running', async () => {
    mockHasStartedLocationUpdatesAsync.mockResolvedValue(true);
    mockStopLocationUpdatesAsync.mockResolvedValue(undefined);

    await ensureWalkLocationTaskStopped();

    expect(mockHasStartedLocationUpdatesAsync).toHaveBeenCalledWith(WALK_LOCATION_TASK);
    expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(WALK_LOCATION_TASK);
  });

  it('is a no-op when the task is not running', async () => {
    mockHasStartedLocationUpdatesAsync.mockResolvedValue(false);

    await ensureWalkLocationTaskStopped();

    expect(mockStopLocationUpdatesAsync).not.toHaveBeenCalled();
  });
});
