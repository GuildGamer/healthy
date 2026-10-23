import { colors } from '@product/brand';
import { StyleSheet, View, type DimensionValue } from 'react-native';

const FADE_STOPS = 28;

/**
 * A darkening band over one edge of a photo so overlaid type stays readable.
 * Built from stacked views because the app carries no gradient library, and
 * eased (squared) so the band has no visible top edge.
 */
export function PhotoFade({
  edge,
  height,
  maxOpacity,
}: {
  edge: 'top' | 'bottom';
  height: DimensionValue;
  maxOpacity: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.fade, edge === 'top' ? styles.top : styles.bottom, { height }]}
    >
      {Array.from({ length: FADE_STOPS }, (_, index) => {
        const distanceFromEdge = edge === 'top' ? index : FADE_STOPS - 1 - index;
        const strength = 1 - distanceFromEdge / (FADE_STOPS - 1);
        return (
          <View key={index} style={[styles.stop, { opacity: strength * strength * maxOpacity }]} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
  stop: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
