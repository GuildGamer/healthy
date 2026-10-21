import { router, type Href } from 'expo-router';

/**
 * Leave the current screen.
 *
 * `canGoBack()` stays true after a redirect gate, and `back()` then does
 * nothing. `canDismiss()` is true only when this stack has another route to
 * reveal, so that is the pop. Otherwise replace a real parent — home, unless
 * the caller knows a better one. Logged-out auth screens must pass their own
 * parent: `/(tabs)` redirects straight back to login.
 */
export function goBackOrHome(fallback: Href = '/(tabs)'): void {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace(fallback);
}
