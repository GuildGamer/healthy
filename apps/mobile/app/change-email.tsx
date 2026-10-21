import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ChangeEmailOtpScreen } from '@/components/profile/ChangeEmailOtpScreen';
import { useSession } from '@/lib/auth-client';
import { goBackOrHome } from '@/lib/go-back';

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default function ChangeEmailRoute() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const newEmail = readParam(useLocalSearchParams<{ email?: string }>().email);

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!newEmail) {
    return <Redirect href="/edit-profile" />;
  }

  return (
    <ChangeEmailOtpScreen
      newEmail={newEmail}
      onBackPress={() => goBackOrHome('/(tabs)/profile')}
      onChanged={() => router.replace('/(tabs)/profile')}
    />
  );
}
