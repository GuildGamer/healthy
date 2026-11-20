import { useLocalSearchParams, useRouter } from 'expo-router';
import { ForgotPasswordEmailScreen } from '@/components/auth';
import { goBackOrHome } from '@/lib/go-back';
import { readSearchParam } from '@/lib/search-params';

export default function ForgotPassword() {
  const router = useRouter();
  const email = readSearchParam(useLocalSearchParams<{ email?: string }>().email);

  return (
    <ForgotPasswordEmailScreen
      initialEmail={email}
      onBackPress={() => goBackOrHome('/login-email')}
      onCodeSent={(sentTo) =>
        router.push({ pathname: '/reset-password', params: { email: sentTo } })
      }
    />
  );
}
