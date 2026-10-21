import { useRouter } from 'expo-router';
import { ForgotPasswordEmailScreen } from '@/components/auth';
import { goBackOrHome } from '@/lib/go-back';

export default function ForgotPassword() {
  const router = useRouter();

  return (
    <ForgotPasswordEmailScreen
      onBackPress={() => goBackOrHome('/login')}
      onCodeSent={(email) =>
        router.push({
          pathname: '/forgot-password-otp',
          params: { email },
        })
      }
    />
  );
}
