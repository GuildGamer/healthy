import { useRouter } from 'expo-router';
import { LoginScreen } from '@/components/auth';

export default function Login() {
  const router = useRouter();

  return (
    <LoginScreen
      onAuthenticated={() => router.replace('/(tabs)')}
      onBackPress={() => router.back()}
      onSignUpPress={() => router.push('/sign-up')}
    />
  );
}
