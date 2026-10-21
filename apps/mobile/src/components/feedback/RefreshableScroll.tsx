import { colors } from '@product/brand';
import { useEffect, useState, type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { usePullRefresh } from './use-pull-refresh';

interface RefreshableScrollProps extends Omit<ScrollViewProps, 'refreshControl'> {
  onPullRefresh: () => Promise<unknown>;
  children: ReactNode;
}

/**
 * iOS Fabric ignores RefreshControl tintColor on first mount, so the system
 * spinner stays dark and disappears on our navy screens. Re-apply the mint
 * tint after attach so pull-to-refresh keeps a single native spinner.
 */
export function RefreshableScroll({
  onPullRefresh,
  children,
  ...scrollProps
}: RefreshableScrollProps) {
  const { isRefreshing, onRefresh } = usePullRefresh(onPullRefresh);
  // Widened: the initial brand token infers as its own literal, which would
  // make the mint re-tint below unassignable.
  const [tintColor, setTintColor] = useState<string>(colors.muted);

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
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
