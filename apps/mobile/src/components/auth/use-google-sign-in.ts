import { useState } from 'react';
import { signInWithGoogle, waitForSession } from '@/lib/auth-client';
import { saveLastSignInMethod } from '@/lib/last-sign-in-method';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';

const GOOGLE_FAILED_MESSAGE = 'Couldn’t continue with Google. Try again, or use email.';

/** Google sign-in for the front door, where sign-up and log in are one step. */
export function useGoogleSignIn(onSignedIn: () => Promise<void> | void) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function start() {
    if (isPending) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(GOOGLE_FAILED_MESSAGE);
        return;
      }

      if (!(await waitForSession())) {
        setErrorMessage(GOOGLE_FAILED_MESSAGE);
        return;
      }

      await saveLastSignInMethod('google');
      await onSignedIn();
    } catch {
      setErrorMessage(CONNECTION_FAILED_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  return { start, isPending, errorMessage };
}
