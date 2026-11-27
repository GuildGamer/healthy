import { useEffect, useState } from 'react';
import type { OtpInputTone } from '@/components/forms';
import type { AuthActionResult } from '@/lib/auth-client';

export const EMAIL_CODE_LENGTH = 6;
const RESEND_WAIT_SECONDS = 60;

/** `expired` covers a code that ran out of time and one locked after three tries. */
export type EmailCodeFailure = 'wrong' | 'expired' | 'connection';

const DEAD_CODE_ERRORS = new Set(['OTP_EXPIRED', 'TOO_MANY_ATTEMPTS']);

export function emailCodeFailureFor(
  error: NonNullable<AuthActionResult['error']>,
): Exclude<EmailCodeFailure, 'connection'> {
  return error.code && DEAD_CODE_ERRORS.has(error.code) ? 'expired' : 'wrong';
}

function useResendCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_WAIT_SECONDS);

  useEffect(() => {
    if (secondsLeft === 0) {
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return { secondsLeft, restart: () => setSecondsLeft(RESEND_WAIT_SECONDS) };
}

/**
 * The six boxes and what went wrong with them. A wrong code clears and rings
 * red until the next digit; an expired one greys out until a new code is sent.
 */
export function useEmailCode(sendCode: () => Promise<AuthActionResult>) {
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<EmailCodeFailure | null>(null);
  const [isResending, setIsResending] = useState(false);
  const countdown = useResendCountdown();

  function changeCode(next: string) {
    if (failure === 'expired') {
      return;
    }

    setFailure(null);
    setCode(next);
  }

  function reject(error: NonNullable<AuthActionResult['error']>) {
    setFailure(emailCodeFailureFor(error));
    setCode('');
  }

  async function resend() {
    if (isResending) {
      return;
    }

    setIsResending(true);
    try {
      const { error } = await sendCode();
      setFailure(error ? 'connection' : null);
      if (!error) {
        setCode('');
        countdown.restart();
      }
    } catch {
      setFailure('connection');
    } finally {
      setIsResending(false);
    }
  }

  const tone: OtpInputTone =
    failure === 'wrong' ? 'invalid' : failure === 'expired' ? 'dimmed' : 'default';

  return {
    code,
    changeCode,
    failure,
    reject,
    failConnection: () => setFailure('connection'),
    tone,
    isComplete: code.length === EMAIL_CODE_LENGTH,
    secondsLeft: countdown.secondsLeft,
    isResending,
    resend,
  };
}

export type EmailCode = ReturnType<typeof useEmailCode>;
