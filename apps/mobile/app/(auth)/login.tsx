import { Redirect, useRouter } from 'expo-router';
import { LoginScreen } from '@/components/auth';
import { ScreenLoader } from '@/components/feedback';
import {
  isEmailVerified,
  readEmailVerified,
  useSession,
} from '@/lib/auth-client';
import { postAuthRoute } from '@/lib/post-auth-route';

export default function Login() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (session) {
    return <Redirect href={postAuthRoute(isEmailVerified(session))} />;
  }

  return (
    <LoginScreen
      onAuthenticated={async () =>
        router.replace(postAuthRoute(await readEmailVerified()))
      }
      onBackPress={() => router.back()}
      onForgotPasswordPress={() => router.push('/forgot-password')}
      onSignUpPress={() => router.push('/sign-up')}
    />
  );
}
