import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChangeEmailOtpScreen } from '@/components/profile/ChangeEmailOtpScreen';
import { goBackOrHome } from '@/lib/go-back';
import { readSearchParam } from '@/lib/search-params';

export default function ChangeEmailRoute() {
  const router = useRouter();
  const newEmail = readSearchParam(useLocalSearchParams<{ email?: string }>().email);

  if (!newEmail) {
    return <Redirect href="/settings/email" />;
  }

  return (
    <ChangeEmailOtpScreen
      newEmail={newEmail}
      onBackPress={() => goBackOrHome('/settings/email')}
      onChanged={() => router.dismissTo('/settings/account')}
    />
  );
}
