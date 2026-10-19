import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { SplashScreen } from '@/components/auth';
import { useSession } from '@/lib/auth-client';
import { claimDeferredInviteToken } from '@/lib/deferred-invite';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

const SPLASH_DURATION_MS = 2300;

export default function Index() {
  const { data: session, isPending } = useSession();
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [postAuthHref, setPostAuthHref] = useState<PostAuthHref | null>(null);
  const [isResolvingPostAuth, setIsResolvingPostAuth] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashComplete(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Claim clipboard / SecureStore invite on every cold open — including the
  // unauthenticated onboarding path — without blocking splash.
  useEffect(() => {
    void claimDeferredInviteToken();
  }, []);

  useEffect(() => {
    if (!isSplashComplete || isPending) {
      return;
    }

    if (!session) {
      setPostAuthHref(null);
      return;
    }

    let cancelled = false;
    setIsResolvingPostAuth(true);
    void resolvePostAuthHref()
      .then((href) => {
        if (!cancelled) {
          setPostAuthHref(href);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingPostAuth(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSplashComplete, isPending, session]);

  if (!isSplashComplete || isPending || (session && (isResolvingPostAuth || !postAuthHref))) {
    return <SplashScreen animate />;
  }

  if (session && postAuthHref) {
    return <Redirect href={postAuthHref} />;
  }

  return <Redirect href="/onboarding" />;
}
