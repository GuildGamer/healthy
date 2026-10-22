import { fontSize, spacing } from '@product/brand';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';
import { DARK_MAP_STYLE } from '@/components/challenges/constants/dark-map-style';
import type { GeoPoint } from '@/lib/geo-session';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

/** Roughly 700 m across: close enough to read every turn of a neighbourhood loop. */
const ROUTE_SPAN_DEGREES = 0.006;
/** Wide enough to orient someone who has not started walking yet. */
const IDLE_SPAN_DEGREES = 0.02;
const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const FOLLOW_DURATION_MS = 500;

const MAP_UNAVAILABLE = 'Map appears after a native rebuild';
const MAP_RECORDING = 'Recording your walk';

type MapsModule = {
  MapView: typeof MapView;
  Marker: typeof import('react-native-maps').Marker;
  Polyline: typeof import('react-native-maps').Polyline;
};

export function WalkRouteMap({
  isRecording,
  points,
}: {
  isRecording: boolean;
  points: GeoPoint[];
}) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const maps = useMapsModule();
  const mapRef = useRef<MapView | null>(null);
  const lastPoint = points[points.length - 1];
  const latitude = lastPoint?.latitude;
  const longitude = lastPoint?.longitude;

  // Follow the walker while recording; leave the camera alone so they can pan
  // around their finished route afterwards.
  useEffect(() => {
    if (!isRecording || latitude === undefined || longitude === undefined) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: ROUTE_SPAN_DEGREES,
        longitudeDelta: ROUTE_SPAN_DEGREES,
      },
      FOLLOW_DURATION_MS,
    );
  }, [isRecording, latitude, longitude]);

  if (!maps) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{isRecording ? MAP_RECORDING : MAP_UNAVAILABLE}</Text>
      </View>
    );
  }

  const { MapView: Map, Marker, Polyline } = maps;
  const start = points[0];
  const hasRoute = points.length > 1;

  return (
    <Map
      customMapStyle={scheme === 'dark' ? DARK_MAP_STYLE : undefined}
      initialRegion={initialRegion(points)}
      ref={mapRef}
      showsCompass={false}
      showsMyLocationButton={false}
      showsPointsOfInterest={false}
      showsUserLocation
      style={StyleSheet.absoluteFill}
      toolbarEnabled={false}
      userInterfaceStyle={scheme}
    >
      {start && hasRoute ? (
        <Marker anchor={{ x: 0.5, y: 0.5 }} coordinate={start} tracksViewChanges={false}>
          <View style={styles.startDot} />
        </Marker>
      ) : null}

      {hasRoute ? (
        <Polyline
          coordinates={points}
          lineCap="round"
          lineJoin="round"
          strokeColor={colors.accent}
          strokeWidth={6}
        />
      ) : null}
    </Map>
  );
}

/** `react-native-maps` is native-only, so a JS-only build must still render. */
function useMapsModule(): MapsModule | null {
  const [maps, setMaps] = useState<MapsModule | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import('react-native-maps')
      .then((module) => {
        if (!cancelled) {
          setMaps({
            MapView: module.default,
            Marker: module.Marker,
            Polyline: module.Polyline,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMaps(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return maps;
}

function initialRegion(points: GeoPoint[]): Region {
  const first = points[0];
  if (!first) {
    return {
      ...LONDON,
      latitudeDelta: IDLE_SPAN_DEGREES,
      longitudeDelta: IDLE_SPAN_DEGREES,
    };
  }

  return {
    latitude: first.latitude,
    longitude: first.longitude,
    latitudeDelta: ROUTE_SPAN_DEGREES,
    longitudeDelta: ROUTE_SPAN_DEGREES,
  };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
      backgroundColor: theme.colors.surface,
    },
    fallbackText: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    startDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 3,
      borderColor: theme.colors.background,
      backgroundColor: theme.colors.accent,
    },
  });
