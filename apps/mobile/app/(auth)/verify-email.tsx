import { Redirect, useRouter } from 'expo-router';
import { EmailVerificationOtpScreen } from '@/components/auth';
import { ScreenLoader } from '@/components/feedback';
import { isEmailVerified, useSession } from '@/lib/auth-client';

export default function VerifyEmail() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const email = session?.user.email;

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!email) {
    return <Redirect href="/login" />;
  }

  if (isEmailVerified(session)) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <EmailVerificationOtpScreen
      email={email}
      onBackPress={() => router.replace('/category-selection')}
      onVerified={() => router.replace('/(tabs)')}
    />
  );
}
