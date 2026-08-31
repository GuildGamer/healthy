import { colors } from '@product/brand';
import { ActivityIndicator } from 'react-native';

interface LoaderProps {
  size?: 'small' | 'large';
}

export function Loader({ size = 'large' }: LoaderProps) {
  return <ActivityIndicator color={colors.accent} size={size} />;
}
