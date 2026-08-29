import { Redirect, useRouter } from 'expo-router';
import { LoginScreen } from '@/components/auth';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';

export default function Login() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
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
