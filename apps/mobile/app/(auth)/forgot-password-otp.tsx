import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ForgotPasswordOtpScreen } from '@/components/auth';

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default function ForgotPasswordOtp() {
  const router = useRouter();
  const email = readParam(useLocalSearchParams<{ email?: string }>().email);

  if (!email) {
    return <Redirect href="/forgot-password" />;
  }

  return (
    <ForgotPasswordOtpScreen
      email={email}
      onBackPress={() => router.back()}
      onVerified={(otp) =>
        router.push({
          pathname: '/reset-password',
          params: { email, otp },
        })
      }
    />
  );
}
