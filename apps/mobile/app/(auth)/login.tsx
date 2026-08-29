import { Redirect, useRouter } from 'expo-router';
import { LoginScreen, SplashScreen } from '@/components/auth';
import { useSession } from '@/lib/auth-client';

export default function Login() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <LoginScreen
      onAuthenticated={() => router.replace('/(tabs)')}
      onBackPress={() => router.back()}
      onForgotPasswordPress={() => router.push('/forgot-password')}
      onSignUpPress={() => router.push('/sign-up')}
    />
  );
}
