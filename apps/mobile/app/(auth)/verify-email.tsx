import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { VerifyEmailScreen } from '@/components/auth';
import { ScreenLoader } from '@/components/feedback';
import { isEmailVerified, useSession } from '@/lib/auth-client';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function VerifyEmail() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const email = session?.user.email;
  const [verifiedHref, setVerifiedHref] = useState<PostAuthHref | null>(null);

  useEffect(() => {
    if (!isEmailVerified(session)) {
      return;
    }

    let cancelled = false;
    void resolvePostAuthHref().then((href) => {
      if (!cancelled) {
        setVerifiedHref(href ?? '/(tabs)');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!email) {
    return <Redirect href="/login" />;
  }

  if (isEmailVerified(session)) {
    if (!verifiedHref) {
      return <ScreenLoader />;
    }

    return <Redirect href={verifiedHref} />;
  }

  return (
    <VerifyEmailScreen
      email={email}
      onVerified={() => {
        void resolvePostAuthHref().then((href) => {
          router.replace(href ?? '/(tabs)');
        });
      }}
    />
  );
}
