import { useLocalSearchParams, useRouter } from 'expo-router';
import { PricingScreen } from '@/components/membership';
import { goBackOrHome } from '@/lib/go-back';

export default function Membership() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const source =
    params.source === 'success' ? 'success' : params.source === 'profile' ? 'profile' : 'other';

  return (
    <PricingScreen
      onClose={() => {
        if (source === 'success') {
          router.replace('/(tabs)/challenges');
          return;
        }

        goBackOrHome();
      }}
      source={source}
    />
  );
}
