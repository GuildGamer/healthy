import { useEffect, useState } from 'react';
import { TOAST_AUTO_HIDE_MS } from '@/components/forms/ToastProvider';

/** A toast that goes away on its own, or as soon as you tap it. */
export function useDeckToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = setTimeout(() => setMessage(null), TOAST_AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return { message, show: setMessage, hide: () => setMessage(null) };
}
