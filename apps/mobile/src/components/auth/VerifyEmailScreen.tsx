import { fontWeight, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { FormButton, InlineNotice, OtpInput } from '@/components/forms';
import { Glyph } from '@/components/icons';
import { sendSignupVerificationOtp, signOut, verifySignupEmail } from '@/lib/auth-client';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';
import { EMAIL_CODE_LENGTH, type EmailCode, useEmailCode } from './email-code';
import { EmailCodeStatus } from './EmailCodeStatus';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';

/** The Mail app's own scheme; Android has no equivalent that opens the inbox. */
const MAIL_APP_URL = 'message://';

interface VerifyEmailScreenProps {
  email: string;
  onVerified: () => void;
}

/**
 * Email sign-ups only. The code fills from Mail and the page moves on by
 * itself at six digits, so there is no Verify button.
 */
export function VerifyEmailScreen({ email, onVerified }: VerifyEmailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const emailCode = useEmailCode(() => sendSignupVerificationOtp(email));
  const [isVerifying, setIsVerifying] = useState(false);
  const leaveAccount = useLeaveUnverifiedAccount();
  useSendCodeOnOpen(email);

  async function verify(code: string) {
    if (isVerifying) {
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await verifySignupEmail({ email, otp: code });
      if (error) {
        emailCode.reject(error);
        return;
      }

      onVerified();
    } catch {
      emailCode.failConnection();
    } finally {
      setIsVerifying(false);
    }
  }

  function changeCode(next: string) {
    emailCode.changeCode(next);
    if (next.length === EMAIL_CODE_LENGTH) {
      void verify(next);
    }
  }

  return (
    <FrontDoorLayout dock={<VerifyDock emailCode={emailCode} />} onBackPress={leaveAccount.start}>
      <FrontDoorTitle
        subtitle={
          <>
            We sent a code to <Text style={styles.email}>{email}</Text>.
          </>
        }
        title="Check your email"
      />
      {leaveAccount.hasFailed ? (
        <InlineNotice icon="offline" message={CONNECTION_FAILED_MESSAGE} tone="error" />
      ) : null}
      <View style={styles.code}>
        <OtpInput
          onChange={changeCode}
          testID="verify-email-otp"
          tone={emailCode.tone}
          value={emailCode.code}
        />
      </View>
      <EmailCodeStatus emailCode={emailCode} />
    </FrontDoorLayout>
  );
}

function VerifyDock({ emailCode }: { emailCode: EmailCode }) {
  const { colors } = useTheme();

  if (emailCode.failure === 'expired') {
    return (
      <FormButton
        label="Send a new code"
        loading={emailCode.isResending}
        onPress={() => void emailCode.resend()}
        testID="verify-email-new-code"
      />
    );
  }

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <FormButton
      label="Open Mail"
      leading={<Glyph color={colors.text} name="mail" size={19} strokeWidth={2} />}
      onPress={() => void Linking.openURL(MAIL_APP_URL).catch(() => undefined)}
      testID="verify-email-open-mail"
      variant="outline"
    />
  );
}

function useSendCodeOnOpen(email: string) {
  const hasSent = useRef(false);

  useEffect(() => {
    if (hasSent.current) {
      return;
    }

    hasSent.current = true;
    void sendSignupVerificationOtp(email);
  }, [email]);
}

/**
 * Back is the way out of a mistyped email until the server allows changing an
 * unverified one: sign out and start again. Signed-out entry, because Login
 * would route a session that has not cleared yet back onto this screen.
 */
function useLeaveUnverifiedAccount() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function leave() {
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);
    setHasFailed(false);
    try {
      const { error } = await signOut();
      if (error) {
        setHasFailed(true);
        return;
      }

      router.replace('/onboarding');
    } catch {
      setHasFailed(true);
    } finally {
      setIsLeaving(false);
    }
  }

  return { start: () => void leave(), hasFailed };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    email: {
      color: theme.colors.text,
      fontWeight: fontWeight.semibold,
    },
    code: {
      marginTop: spacing.lg,
    },
  });
