import { StyleSheet, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { Loader } from './Loader';

interface ScreenLoaderProps {
  testID?: string;
}

export function ScreenLoader({ testID = 'screen-loader' }: ScreenLoaderProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.screen} testID={testID}>
      <Loader />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignSelf: 'stretch',
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
