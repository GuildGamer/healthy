import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  sendSignupVerificationOtp,
  signOut,
  verifySignupEmail,
  type AuthActionResult,
} from '@/lib/auth-client';
import { EmailOtpScreen } from './EmailOtpScreen';

type EmailVerificationOtpScreenProps = {
  email: string;
  onBackPress: () => void;
  onVerified: () => void;
};

export function EmailVerificationOtpScreen({
  email,
  onBackPress,
  onVerified,
}: EmailVerificationOtpScreenProps) {
  const router = useRouter();
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) {
      return;
    }

    hasRequested.current = true;
    void sendSignupVerificationOtp(email);
  }, [email]);

  async function useAnotherAccount(): Promise<AuthActionResult> {
    try {
      const result = await signOut();
      if (result.error) {
        return { error: { message: result.error.message } };
      }

      // Signed-out entry. Login would route a session that has not cleared yet
      // back through the post-auth gate onto this screen.
      router.replace('/onboarding');
      return { error: null };
    } catch {
      return { error: { message: 'Could not sign out.' } };
    }
  }

  return (
    <EmailOtpScreen
      email={email}
      onBackPress={onBackPress}
      onResend={() => sendSignupVerificationOtp(email)}
      onSuccess={() => onVerified()}
      onUseAnotherAccount={useAnotherAccount}
      onVerify={(otp) => verifySignupEmail({ email, otp })}
      testIDPrefix="verify-email"
      title="Verify Your Email"
    />
  );
}
