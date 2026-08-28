import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/auth';

export default function Onboarding() {
  const router = useRouter();

  return (
    <OnboardingScreen
      onGetStarted={() => router.push('/sign-up')}
      onLoginPress={() => router.push('/login')}
    />
  );
}
