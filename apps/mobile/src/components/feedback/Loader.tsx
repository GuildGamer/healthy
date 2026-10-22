import { ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';

interface LoaderProps {
  size?: 'small' | 'large';
}

export function Loader({ size = 'large' }: LoaderProps) {
  const { colors } = useTheme();
  return <ActivityIndicator color={colors.accent} size={size} />;
}
