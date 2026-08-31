import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { CompleteCountryScreen } from '@/components/auth';
import { ScreenLoader } from '@/components/feedback';
import { signOut, useSession } from '@/lib/auth-client';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function CompleteCountry() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [needsName, setNeedsName] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    setNeedsName(!session.user.name?.trim());
  }, [session]);

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <CompleteCountryScreen
      needsName={needsName}
      onBackPress={async () => {
        await signOut();
        router.replace('/onboarding');
      }}
      onCompleted={async () => {
        const href = await resolvePostAuthHref();
        router.replace(href ?? '/category-selection');
      }}
    />
  );
}
