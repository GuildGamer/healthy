import { useEffect, useRef } from 'react';
import {
  sendSignupVerificationOtp,
  verifySignupEmail,
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
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) {
      return;
    }

    hasRequested.current = true;
    void sendSignupVerificationOtp(email);
  }, [email]);

  return (
    <EmailOtpScreen
      email={email}
      onBackPress={onBackPress}
      onResend={() => sendSignupVerificationOtp(email)}
      onSuccess={() => onVerified()}
      onVerify={(otp) => verifySignupEmail({ email, otp })}
      testIDPrefix="verify-email"
      title="Verify Your Email"
    />
  );
}
