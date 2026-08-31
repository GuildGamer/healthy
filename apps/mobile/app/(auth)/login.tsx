import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { LoginScreen } from '@/components/auth';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function Login() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sessionHref, setSessionHref] = useState<PostAuthHref | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!session) {
      setSessionHref(null);
      return;
    }

    let cancelled = false;
    setIsResolving(true);
    void resolvePostAuthHref()
      .then((href) => {
        if (!cancelled) {
          setSessionHref(href);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolving(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (isPending || (session && (isResolving || !sessionHref))) {
    return <ScreenLoader />;
  }

  if (session && sessionHref) {
    return <Redirect href={sessionHref} />;
  }

  return (
    <LoginScreen
      onAuthenticated={async () => {
        const href = await resolvePostAuthHref();
        router.replace(href ?? '/complete-country');
      }}
      onBackPress={() => router.back()}
      onForgotPasswordPress={() => router.push('/forgot-password')}
      onSignUpPress={() => router.push('/sign-up')}
    />
  );
}
