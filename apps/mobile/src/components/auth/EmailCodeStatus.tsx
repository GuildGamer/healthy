import { fontWeight } from '@product/brand';
import { StyleSheet, Text } from 'react-native';
import { InlineNotice } from '@/components/forms';
import { type Theme, useThemedStyles } from '@/theme';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';
import type { EmailCode } from './email-code';
import { FieldError, FieldNote } from './FrontDoorText';

const WRONG_CODE_MESSAGE = 'That code doesn’t match. Check the newest email from us.';
const EXPIRED_CODE_MESSAGE = 'This code has expired. Codes last 5 minutes.';

/** Everything under the code boxes: what went wrong, and when a new code can be sent. */
export function EmailCodeStatus({ emailCode }: { emailCode: EmailCode }) {
  if (emailCode.failure === 'expired') {
    return (
      <InlineNotice
        icon="clock"
        message={EXPIRED_CODE_MESSAGE}
        testID="email-code-expired"
        tone="warning"
      />
    );
  }

  return (
    <>
      {emailCode.failure === 'wrong' ? (
        <FieldError centered testID="email-code-wrong">
          {WRONG_CODE_MESSAGE}
        </FieldError>
      ) : null}
      {emailCode.failure === 'connection' ? (
        <InlineNotice icon="offline" message={CONNECTION_FAILED_MESSAGE} tone="error" />
      ) : null}
      <ResendCodeNote emailCode={emailCode} />
    </>
  );
}

function ResendCodeNote({ emailCode }: { emailCode: EmailCode }) {
  const styles = useThemedStyles(createStyles);
  const lasts = emailCode.failure === 'wrong' ? '' : 'It lasts 5 minutes. ';

  if (emailCode.secondsLeft > 0) {
    return (
      <FieldNote centered>
        {lasts}Send a new one in {emailCode.secondsLeft}s.
      </FieldNote>
    );
  }

  return (
    <FieldNote centered>
      {lasts}
      <Text
        accessibilityRole="button"
        disabled={emailCode.isResending}
        onPress={() => void emailCode.resend()}
        style={styles.action}
        testID="email-code-resend"
      >
        {emailCode.isResending ? 'Sending…' : 'Send a new one'}
      </Text>
    </FieldNote>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    action: {
      color: theme.colors.text,
      fontWeight: fontWeight.semibold,
    },
  });
