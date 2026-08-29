import { useRouter } from 'expo-router';
import { PasswordResetSuccessScreen } from '@/components/auth';

export default function PasswordResetSuccess() {
  const router = useRouter();

  return (
    <PasswordResetSuccessScreen
      onContinue={() => router.replace('/login')}
    />
  );
}
