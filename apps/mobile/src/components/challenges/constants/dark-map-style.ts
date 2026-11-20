import { darkColors } from '@product/brand';
import type { MapStyleElement } from 'react-native-maps';

/**
 * Google Maps (Android) has no dark mode flag, so the palette is handed over as
 * style rules; Apple Maps takes `userInterfaceStyle` instead. Roads are the only
 * thing lifted above the background — the route polyline has to stay the
 * brightest object on screen.
 */
export const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: darkColors.background }] },
  { elementType: 'labels.text.fill', stylers: [{ color: darkColors.muted }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: darkColors.background }] },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: darkColors.surface }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: darkColors.surfaceRaised }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: darkColors.muted }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: darkColors.surface }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#081020' }],
  },
];
