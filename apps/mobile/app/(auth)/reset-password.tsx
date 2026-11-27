import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ResetPasswordScreen } from '@/components/auth';
import { goBackOrHome } from '@/lib/go-back';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import { readSearchParam } from '@/lib/search-params';

export default function ResetPassword() {
  const router = useRouter();
  const email = readSearchParam(useLocalSearchParams<{ email?: string }>().email);

  if (!email) {
    return <Redirect href="/forgot-password" />;
  }

  return (
    <ResetPasswordScreen
      email={email}
      onBackPress={() => goBackOrHome('/forgot-password')}
      onSignedIn={async () => {
        const href = await resolvePostAuthHref();
        router.replace(href ?? '/(tabs)');
      }}
    />
  );
}
