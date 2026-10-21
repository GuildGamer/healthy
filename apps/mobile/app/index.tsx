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
  const sessionUserId = session?.user.id;
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [postAuthHref, setPostAuthHref] = useState<PostAuthHref | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashComplete(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Claim SecureStore / one-shot clipboard invite on cold open — including the
  // unauthenticated onboarding path — without blocking splash.
  useEffect(() => {
    void claimDeferredInviteToken();
  }, []);

  useEffect(() => {
    if (!isSplashComplete) {
      return;
    }

    if (!sessionUserId) {
      setPostAuthHref(null);
      return;
    }

    let cancelled = false;
    void resolvePostAuthHref().then((href) => {
      if (!cancelled) {
        setPostAuthHref(href);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isSplashComplete, sessionUserId]);

  // Keep prior redirect while a known session re-resolves after background refresh.
  if (!isSplashComplete || (isPending && !session) || (session && !postAuthHref)) {
    return <SplashScreen animate />;
  }

  if (session && postAuthHref) {
    return <Redirect href={postAuthHref} />;
  }

  return <Redirect href="/onboarding" />;
}
