import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmailOtpScreen } from '@/components/auth/EmailOtpScreen';
import { confirmEmailChange, requestEmailChange } from '@/lib/auth-client';

type ChangeEmailOtpScreenProps = {
  newEmail: string;
  onBackPress: () => void;
  onChanged: () => void;
};

export function ChangeEmailOtpScreen({
  newEmail,
  onBackPress,
  onChanged,
}: ChangeEmailOtpScreenProps) {
  const queryClient = useQueryClient();
  const [didChange, setDidChange] = useState(false);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    if (!didChange) {
      return;
    }

    const timer = setTimeout(() => {
      onChangedRef.current();
    }, 1200);

    return () => clearTimeout(timer);
  }, [didChange]);

  if (didChange) {
    return (
      <View style={styles.saved} testID="change-email-saved">
        <View style={styles.savedIcon}>
          <Feather color={colors.accent} name="check-circle" size={48} />
        </View>
        <Text style={styles.savedTitle}>Email Updated</Text>
        <Text style={styles.savedBody}>
          Sign in with {newEmail} from now on.
        </Text>
      </View>
    );
  }

  return (
    <EmailOtpScreen
      email={newEmail}
      onBackPress={onBackPress}
      onResend={() => requestEmailChange(newEmail)}
      onSuccess={() => {
        void queryClient.invalidateQueries({ queryKey: ['me'] });
        setDidChange(true);
      }}
      onVerify={(otp) => confirmEmailChange({ newEmail, otp })}
      testIDPrefix="change-email"
      title="Confirm Your Email"
    />
  );
}

const styles = StyleSheet.create({
  saved: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  savedIcon: {
    marginBottom: spacing.sm,
  },
  savedTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  savedBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
