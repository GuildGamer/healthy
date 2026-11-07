import { type Href, router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Gate routes must replace, not redirect — a Redirect leaves the current
 * screen on the stack, so Back re-opens it and immediately redirects again.
 */
export function useReplaceRoute(href: Href | null): void {
  useEffect(() => {
    if (!href) {
      return;
    }

    router.replace(href);
  }, [href]);
}
