import { useEffect, useState } from 'react';
import { loadLastSignInMethod, type SignInMethod } from '@/lib/last-sign-in-method';

/** The way in this phone used last, or null until known or if never saved. */
export function useLastSignInMethod(): SignInMethod | null {
  const [lastSignInMethod, setLastSignInMethod] = useState<SignInMethod | null>(null);

  useEffect(() => {
    let isActive = true;
    void loadLastSignInMethod().then((method) => {
      if (isActive) {
        setLastSignInMethod(method);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  return lastSignInMethod;
}
