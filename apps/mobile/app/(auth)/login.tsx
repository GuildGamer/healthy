import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { LoginScreen } from '@/components/auth';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';
import { goBackOrHome } from '@/lib/go-back';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function Login() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const sessionUserId = session?.user.id;
  const [sessionHref, setSessionHref] = useState<PostAuthHref | null>(null);

  useEffect(() => {
    if (!sessionUserId) {
      setSessionHref(null);
      return;
    }

    let cancelled = false;
    void resolvePostAuthHref().then((href) => {
      if (!cancelled) {
        setSessionHref(href);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  // First signed-in resolve only — keep Login / prior redirect during refetch.
  if ((isPending && !session) || (session && !sessionHref)) {
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
      onBackPress={() => goBackOrHome('/onboarding')}
      onForgotPasswordPress={() => router.push('/forgot-password')}
      onSignUpPress={() => router.push('/sign-up')}
    />
  );
}
