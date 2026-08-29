import { colors } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import { Loader } from './Loader';

interface ScreenLoaderProps {
  testID?: string;
}

export function ScreenLoader({ testID = 'screen-loader' }: ScreenLoaderProps) {
  return (
    <View style={styles.screen} testID={testID}>
      <Loader />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
