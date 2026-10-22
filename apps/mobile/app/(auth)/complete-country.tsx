import { Redirect, useRouter } from 'expo-router';
import { TwoQuickThingsScreen, usePendingInvite } from '@/components/auth';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function CompleteCountry() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const pendingInvite = usePendingInvite();

  if (isPending || pendingInvite.isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <TwoQuickThingsScreen
      accountName={session.user.name}
      invite={pendingInvite.invite}
      onCompleted={async () => {
        const href = await resolvePostAuthHref();
        router.replace(href ?? '/category-selection');
      }}
    />
  );
}
