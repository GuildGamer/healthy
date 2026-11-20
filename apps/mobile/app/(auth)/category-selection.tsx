import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenLoader } from '@/components/feedback';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import type { PostAuthHref } from '@/lib/post-auth-route';

/**
 * Condition picker is retired for the fitness pivot. Anyone who still lands
 * here (deep link, deferred onboarding) is sent to the next real step.
 */
export default function CategorySelection() {
  const [href, setHref] = useState<PostAuthHref | null>(null);

  useEffect(() => {
    void resolvePostAuthHref().then((next) => {
      setHref(next ?? '/(tabs)');
    });
  }, []);

  if (!href) {
    return <ScreenLoader />;
  }

  return <Redirect href={href} />;
}
