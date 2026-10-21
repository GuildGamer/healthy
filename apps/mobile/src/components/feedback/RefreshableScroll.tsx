import { colors } from '@product/brand';
import { type ReactNode } from 'react';
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
 * iOS Fabric makes RefreshControl tint unreliable on navy screens. Drive the
 * visible spinner ourselves and paint the native control in the background so
 * the pull gesture still works without a second spinner.
 */
export function RefreshableScroll({
  onPullRefresh,
  children,
  ...scrollProps
}: RefreshableScrollProps) {
  const { isRefreshing, onRefresh } = usePullRefresh(onPullRefresh);
  const hiddenTint = colors.background;

  return (
    <View style={styles.host}>
      <ScrollView
        alwaysBounceVertical
        {...scrollProps}
        refreshControl={
          <RefreshControl
            colors={[hiddenTint]}
            onRefresh={onRefresh}
            progressBackgroundColor={colors.background}
            refreshing={isRefreshing}
            tintColor={hiddenTint}
            titleColor={hiddenTint}
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
