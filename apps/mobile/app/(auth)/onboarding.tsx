import { useRouter } from 'expo-router';
import { CreateAccountScreen } from '@/components/auth';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function Onboarding() {
  const router = useRouter();

  return (
    <CreateAccountScreen
      onEmailPress={() => router.push('/sign-up-email')}
      onLoginPress={() => router.push('/login')}
      onSignedIn={async () => {
        const href = await resolvePostAuthHref();
        router.replace(href ?? '/complete-country');
      }}
    />
  );
}
