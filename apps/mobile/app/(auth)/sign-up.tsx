import { useRouter } from 'expo-router';
import { SignUpScreen } from '@/components/auth';

export default function SignUp() {
  const router = useRouter();

  return (
    <SignUpScreen
      onBackPress={() => router.back()}
      onLoginPress={() => router.push('/login')}
      onSignedUp={() => router.replace('/category-selection')}
    />
  );
}
