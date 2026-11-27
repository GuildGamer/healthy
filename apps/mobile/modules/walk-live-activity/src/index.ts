import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type WalkCardCopy = {
  title: string;
  body: string;
  progress: number | null;
  appearance: {
    backgroundColor: string;
    titleColor: string;
    subtitleColor: string;
    progressViewTint: string;
    buttonLabelColor: string;
    padding: number;
  };
};

type LiveActivityState = {
  title: string;
  subtitle?: string;
  progressBar?: { progress: number };
};

type LiveActivityConfig = {
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  progressViewTint?: string;
  progressViewLabelColor?: string;
  padding?: number;
  /** Path only — expo-live-activity prefixes the app scheme. */
  deepLinkUrl?: string;
};

type LiveActivityApi = {
  startActivity: (
    state: LiveActivityState,
    config?: LiveActivityConfig,
  ) => string | void;
  updateActivity: (id: string, state: LiveActivityState) => void;
  stopActivity: (id: string, state: LiveActivityState) => void;
};

/** Survives process death so cold start can end an orphan Island card. */
const ACTIVITY_ID_KEY = 'walk_live_activity_id';

const ENDED_COPY: WalkCardCopy = {
  title: '00:00',
  body: 'Walk ended',
  progress: null,
  appearance: {
    backgroundColor: '#1A2438',
    titleColor: '#F4F7FB',
    subtitleColor: '#9AA8BF',
    progressViewTint: '#3DDC97',
    buttonLabelColor: '#0B1220',
    padding: 20,
  },
};

let activityId: string | null = null;
let lastBackgroundColor: string | null = null;

function loadLiveActivity(): LiveActivityApi | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-live-activity') as LiveActivityApi;
  } catch {
    return null;
  }
}

function toState(copy: WalkCardCopy): LiveActivityState {
  const state: LiveActivityState = {
    title: copy.title,
    subtitle: copy.body,
  };

  if (copy.progress !== null) {
    state.progressBar = { progress: copy.progress };
  }

  return state;
}

function toConfig(copy: WalkCardCopy): LiveActivityConfig {
  return {
    backgroundColor: copy.appearance.backgroundColor,
    titleColor: copy.appearance.titleColor,
    subtitleColor: copy.appearance.subtitleColor,
    progressViewTint: copy.appearance.progressViewTint,
    progressViewLabelColor: copy.appearance.buttonLabelColor,
    padding: copy.appearance.padding,
    // Opens Today when the walker taps the copy, not the Pause / Resume control.
    deepLinkUrl: 'home',
  };
}

function persistActivityId(id: string | null): void {
  void (async () => {
    try {
      if (id) {
        await SecureStore.setItemAsync(ACTIVITY_ID_KEY, id);
      } else {
        await SecureStore.deleteItemAsync(ACTIVITY_ID_KEY);
      }
    } catch {
      // Storage unavailable — in-memory id still works for this process.
    }
  })();
}

function stopActivityById(
  api: LiveActivityApi,
  id: string,
  copy?: WalkCardCopy,
): void {
  try {
    api.stopActivity(id, toState(copy ?? ENDED_COPY));
  } catch {
    // Already gone.
  }
}

function stopCurrent(api: LiveActivityApi, copy?: WalkCardCopy): void {
  const id = activityId;
  activityId = null;
  lastBackgroundColor = null;
  persistActivityId(null);
  if (!id) {
    return;
  }

  stopActivityById(api, id, copy);
}

/** Starts the iOS lock-screen card. No-op on Android and older binaries. */
export function startWalkLiveActivity(copy: WalkCardCopy): void {
  const api = loadLiveActivity();
  if (!api) {
    return;
  }

  try {
    stopCurrent(api, copy);
    const id = api.startActivity(toState(copy), toConfig(copy));
    activityId = typeof id === 'string' && id.length > 0 ? id : null;
    lastBackgroundColor = activityId ? copy.appearance.backgroundColor : null;
    persistActivityId(activityId);
    if (!activityId) {
      console.warn('[walk-live-activity] startActivity returned no id');
    }
  } catch (error) {
    activityId = null;
    lastBackgroundColor = null;
    persistActivityId(null);
    console.warn('[walk-live-activity] startActivity failed', error);
  }
}

/**
 * Pushes clock / pause copy. Appearance lives on ActivityKit attributes, so a
 * Light ↔ Dark flip restarts the activity; content-only updates do not.
 */
export function updateWalkLiveActivity(copy: WalkCardCopy): void {
  if (!activityId) {
    return;
  }

  const api = loadLiveActivity();
  if (!api) {
    return;
  }

  if (
    lastBackgroundColor !== null &&
    lastBackgroundColor !== copy.appearance.backgroundColor
  ) {
    startWalkLiveActivity(copy);
    return;
  }

  try {
    api.updateActivity(activityId, toState(copy));
  } catch {
    // A dismissed activity should not stop the walk.
  }
}

export function endWalkLiveActivity(copy?: WalkCardCopy): void {
  const api = loadLiveActivity();
  if (!api) {
    activityId = null;
    lastBackgroundColor = null;
    persistActivityId(null);
    return;
  }

  stopCurrent(api, copy);
}

/**
 * Ends a Live Activity left behind after process death (id only in SecureStore)
 * or still held in this process. Safe to call on every cold start.
 */
export async function clearOrphanWalkLiveActivities(): Promise<void> {
  let stored: string | null = null;
  try {
    stored = await SecureStore.getItemAsync(ACTIVITY_ID_KEY);
  } catch {
    stored = null;
  }

  const id = activityId ?? stored;
  activityId = null;
  lastBackgroundColor = null;
  persistActivityId(null);

  if (!id) {
    return;
  }

  const api = loadLiveActivity();
  if (!api) {
    return;
  }

  stopActivityById(api, id);
}
