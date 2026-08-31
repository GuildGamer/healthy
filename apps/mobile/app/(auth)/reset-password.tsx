import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ResetPasswordScreen } from '@/components/auth';

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; otp?: string }>();
  const email = readParam(params.email);
  const otp = readParam(params.otp);

  if (!email || !otp) {
    return <Redirect href="/forgot-password" />;
  }

  return (
    <ResetPasswordScreen
      email={email}
      onBackPress={() => router.back()}
      onResetComplete={() => router.replace('/password-reset-success')}
      otp={otp}
    />
  );
}
