import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';
import { claimDeferredInviteToken } from '@/lib/deferred-invite';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

type LaunchHref = PostAuthHref | '/onboarding';

/**
 * Never leaves launch waiting: if the profile can't be loaded (offline, API
 * down) Today opens and shows its own offline state, and a session that
 * can't be confirmed goes to the welcome.
 */
async function resolveLaunchHref(): Promise<LaunchHref> {
  try {
    return (await resolvePostAuthHref()) ?? '/onboarding';
  } catch {
    return '/(tabs)';
  }
}

export default function Index() {
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
    void resolveLaunchHref().then((href) => {
      if (!cancelled) {
        setPostAuthHref(href);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

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
