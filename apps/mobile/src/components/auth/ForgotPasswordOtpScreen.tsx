import {
  checkPasswordResetOtp,
  requestPasswordResetEmail,
} from '@/lib/auth-client';
import { EmailOtpScreen } from './EmailOtpScreen';

type ForgotPasswordOtpScreenProps = {
  email: string;
  onBackPress: () => void;
  onVerified: (otp: string) => void;
};

export function ForgotPasswordOtpScreen({
  email,
  onBackPress,
  onVerified,
}: ForgotPasswordOtpScreenProps) {
  return (
    <EmailOtpScreen
      email={email}
      onBackPress={onBackPress}
      onResend={() => requestPasswordResetEmail(email)}
      onSuccess={onVerified}
      onVerify={(otp) => checkPasswordResetOtp({ email, otp })}
      testIDPrefix="forgot"
      title="Enter Verification Code"
    />
  );
}
