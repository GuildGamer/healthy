import { useRouter } from 'expo-router';
import { ForgotPasswordEmailScreen } from '@/components/auth';

export default function ForgotPassword() {
  const router = useRouter();

  return (
    <ForgotPasswordEmailScreen
      onBackPress={() => router.back()}
      onCodeSent={(email) =>
        router.push({
          pathname: '/forgot-password-otp',
          params: { email },
        })
      }
    />
  );
}
