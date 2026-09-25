import { colors } from '@product/brand';
import type { MapStyleElement } from 'react-native-maps';

/**
 * Google Maps (Android) has no dark mode flag, so the palette is handed over as
 * style rules; Apple Maps takes `userInterfaceStyle` instead. Roads are the only
 * thing lifted above the background — the route polyline has to stay the
 * brightest object on screen.
 */
export const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: colors.background }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.muted }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.background }] },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: colors.surface }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: colors.surfaceRaised }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.muted }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: colors.surface }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#081020' }],
  },
];
