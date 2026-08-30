import { useEffect } from 'react';
import { ToastBanner } from './ToastBanner';
import { useOptionalToastHost } from './ToastProvider';
import type { ToastTone } from './types';

interface FormErrorBannerProps {
  message: string;
  tone?: ToastTone;
}

export function FormErrorBanner({ message, tone = 'error' }: FormErrorBannerProps) {
  const host = useOptionalToastHost();

  useEffect(() => {
    if (!host) {
      return;
    }

    host.show({ message, tone });
    return () => host.hide();
  }, [host, message, tone]);

  if (host) {
    return null;
  }

  return <ToastBanner message={message} testID="form-error-banner" tone={tone} />;
}
