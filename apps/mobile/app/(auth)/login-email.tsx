import { useRouter } from 'expo-router';
import { LoginEmailScreen } from '@/components/auth';
import { goBackOrHome } from '@/lib/go-back';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function LoginEmail() {
  const router = useRouter();

  return (
    <LoginEmailScreen
      onBackPress={() => goBackOrHome('/login')}
      onForgotPasswordPress={(email) =>
        router.push({ pathname: '/forgot-password', params: { email } })
      }
      onSignedIn={async () => {
        const href = await resolvePostAuthHref();
        router.replace(href ?? '/complete-country');
      }}
    />
  );
}
