import { useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';
import { claimDeferredInviteToken } from '@/lib/deferred-invite';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import { seedMeCache } from '@/lib/seed-me-cache';
import { applyTabsGateResolve } from '@/lib/tabs-gate-cache';

type LaunchHref = PostAuthHref | '/onboarding';

export default function Index() {
  const queryClient = useQueryClient();
  const { data: session, isPending } = useSession();
  const sessionUserId = session?.user.id;
  const [postAuthHref, setPostAuthHref] = useState<LaunchHref | null>(null);

  // Claim SecureStore / one-shot clipboard invite on cold open — including the
  // unauthenticated onboarding path — without blocking splash.
  useEffect(() => {
    void claimDeferredInviteToken();
  }, []);

  useEffect(() => {
    if (!sessionUserId) {
      setPostAuthHref(null);
      return;
    }

    let cancelled = false;
    void resolvePostAuthHref({
      onMe: (me) => seedMeCache(queryClient, me),
    })
      .then((href) => {
        if (cancelled) {
          return;
        }

        const next = href ?? '/onboarding';
        if (next === '/(tabs)') {
          applyTabsGateResolve(sessionUserId, '/(tabs)');
        }
        setPostAuthHref(next);
      })
      .catch(() => {
        if (!cancelled) {
          applyTabsGateResolve(sessionUserId, '/(tabs)');
          setPostAuthHref('/(tabs)');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [queryClient, sessionUserId]);

  // Keep prior redirect while a known session re-resolves after background refresh.
  // At launch the root layout's splash covers this until the redirect lands.
  if ((isPending && !session) || (session && !postAuthHref)) {
    return <ScreenLoader />;
  }

  if (session && postAuthHref) {
    return <Redirect href={postAuthHref} />;
  }

  return <Redirect href="/onboarding" />;
}
