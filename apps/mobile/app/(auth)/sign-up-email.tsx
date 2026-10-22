import { useRouter } from 'expo-router';
import { EmailSignUpScreen } from '@/components/auth';
import { goBackOrHome } from '@/lib/go-back';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function SignUpEmail() {
  const router = useRouter();

  return (
    <EmailSignUpScreen
      onBackPress={() => goBackOrHome('/onboarding')}
      onLoginPress={() => router.replace('/login-email')}
      onSignedUp={async () => {
        const href = await resolvePostAuthHref();
        router.replace(href ?? '/complete-country');
      }}
    />
  );
}
