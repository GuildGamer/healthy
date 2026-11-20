import { useSegments } from 'expo-router';

/**
 * True once navigation has moved off the root `index` route, which decides
 * where launch goes. Segments, not the pathname: groups are dropped from the
 * pathname, so Today at `(tabs)/index` reports '/' exactly like `index`.
 */
export function useHasLeftLaunchRoute(): boolean {
  return useSegments().length > 0;
}
