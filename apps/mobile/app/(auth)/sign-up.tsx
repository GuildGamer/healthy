import { useRouter } from 'expo-router';
import { SignUpScreen } from '@/components/auth';
import { goBackOrHome } from '@/lib/go-back';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function SignUp() {
  const router = useRouter();

  return (
    <SignUpScreen
      onBackPress={() => goBackOrHome('/onboarding')}
      onLoginPress={() => router.push('/login')}
      onSignedUp={() => router.replace('/category-selection')}
      onSocialSignedIn={async () => {
        const href = await resolvePostAuthHref();
        router.replace(href ?? '/complete-country');
      }}
    />
  );
}
