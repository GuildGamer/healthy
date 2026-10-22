import { fontSize, spacing } from '@product/brand';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner, OtpInput } from '@/components/forms';
import type { AuthActionResult } from '@/lib/auth-client';
import { type Theme, useThemedStyles } from '@/theme';
import { AuthScreenHeader } from './AuthScreenHeader';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const INVALID_CODE_MESSAGE = 'That code is not valid. Try again.';
const NETWORK_FAILED_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

export function EmailOtpScreen({
  email,
  onBackPress,
  onResend,
  onSuccess,
  onUseAnotherAccount,
  onVerify,
  testIDPrefix,
  title,
}: {
  email: string;
  onBackPress: () => void;
  onResend: () => Promise<AuthActionResult>;
  onSuccess: (otp: string) => void;
  onUseAnotherAccount?: () => Promise<AuthActionResult>;
  onVerify: (otp: string) => Promise<AuthActionResult>;
  testIDPrefix: string;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isLeavingAccount, setIsLeavingAccount] = useState(false);

  useEffect(() => {
    if (secondsLeft === 0) {
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function verify(code: string) {
    if (code.length !== OTP_LENGTH || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await onVerify(code);

      if (error) {
        setErrorMessage(INVALID_CODE_MESSAGE);
        return;
      }

      onSuccess(code);
    } catch {
      setErrorMessage(NETWORK_FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUseAnotherAccount() {
    if (!onUseAnotherAccount || isLeavingAccount) {
      return;
    }

    setIsLeavingAccount(true);
    setErrorMessage(null);

    try {
      const { error } = await onUseAnotherAccount();
      if (error) {
        setErrorMessage(NETWORK_FAILED_MESSAGE);
        setIsLeavingAccount(false);
      }
    } catch {
      setErrorMessage(NETWORK_FAILED_MESSAGE);
      setIsLeavingAccount(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setErrorMessage(null);

    try {
      const { error } = await onResend();

      if (error) {
        setErrorMessage(NETWORK_FAILED_MESSAGE);
        return;
      }

      setOtp('');
      setSecondsLeft(RESEND_SECONDS);
    } catch {
      setErrorMessage(NETWORK_FAILED_MESSAGE);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthScreenHeader
            onBackPress={onBackPress}
            subtitle={`We sent a 6-digit code to ${email}`}
            title={title}
          />

          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

          <OtpInput
            onChange={(next) => {
              setOtp(next);
              if (next.length === OTP_LENGTH) {
                void verify(next);
              }
            }}
            testID={`${testIDPrefix}-otp`}
            value={otp}
          />

          <View style={styles.resendRow}>
            {secondsLeft > 0 ? (
              <Text style={styles.resendWait}>
                Resend code in <Text style={styles.resendAccent}>{secondsLeft}s</Text>
              </Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={isResending}
                onPress={() => {
                  void handleResend();
                }}
                testID={`${testIDPrefix}-resend`}
              >
                <Text style={styles.resendAction}>{isResending ? 'Sending…' : 'Resend Code'}</Text>
              </Pressable>
            )}
          </View>

          <FormButton
            disabled={otp.length !== OTP_LENGTH}
            label="Verify Code"
            loading={isSubmitting}
            onPress={() => {
              void verify(otp);
            }}
            testID={`${testIDPrefix}-verify`}
          />

          {onUseAnotherAccount ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isLeavingAccount }}
              disabled={isLeavingAccount}
              onPress={() => {
                void handleUseAnotherAccount();
              }}
              style={styles.alternateAccount}
              testID={`${testIDPrefix}-use-another-account`}
            >
              <Text style={styles.alternateAccountLabel}>Use another account</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    resendRow: {
      alignItems: 'center',
      minHeight: 24,
    },
    resendWait: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
    resendAccent: {
      color: theme.colors.accent,
    },
    resendAction: {
      color: theme.colors.accent,
      fontSize: fontSize.sm,
    },
    alternateAccount: {
      alignItems: 'center',
    },
    alternateAccountLabel: {
      color: theme.colors.accent,
      fontSize: fontSize.sm,
    },
  });
