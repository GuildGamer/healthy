import { colors } from '@product/brand';
import { useEffect, useState, type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { Loader } from './Loader';
import { usePullRefresh } from './use-pull-refresh';

interface RefreshableScrollProps extends Omit<ScrollViewProps, 'refreshControl'> {
  onPullRefresh: () => Promise<unknown>;
  children: ReactNode;
}

/**
 * iOS Fabric ignores RefreshControl tintColor on first mount, so the system
 * spinner stays dark and disappears on our navy screens. We re-apply the mint
 * tint after attach, and draw our own loader while a pull is in flight.
 */
export function RefreshableScroll({
  onPullRefresh,
  children,
  ...scrollProps
}: RefreshableScrollProps) {
  const { isRefreshing, onRefresh } = usePullRefresh(onPullRefresh);
  const [tintColor, setTintColor] = useState(colors.muted);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTintColor(colors.accent);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.host}>
      <ScrollView
        alwaysBounceVertical
        {...scrollProps}
        refreshControl={
          <RefreshControl
            colors={[tintColor]}
            onRefresh={onRefresh}
            progressBackgroundColor={colors.surface}
            refreshing={isRefreshing}
            tintColor={tintColor}
            titleColor={tintColor}
          />
        }
      >
        {children}
      </ScrollView>
      {isRefreshing ? (
        <View pointerEvents="none" style={styles.overlay} testID="pull-refresh-loader">
          <Loader />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 56,
    right: 0,
    left: 0,
    alignItems: 'center',
  },
});
