import { useLocalSearchParams, useRouter } from 'expo-router';
import { PricingScreen } from '@/components/membership';

export default function Membership() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const source =
    params.source === 'success'
      ? 'success'
      : params.source === 'profile'
        ? 'profile'
        : 'other';

  return (
    <PricingScreen
      onClose={() => {
        if (source === 'success') {
          router.replace('/(tabs)/challenges');
          return;
        }

        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace('/(tabs)');
      }}
      source={source}
    />
  );
}
