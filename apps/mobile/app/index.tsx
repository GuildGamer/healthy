import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { SplashScreen } from '@/components/auth';
import { isEmailVerified, useSession } from '@/lib/auth-client';
import { postAuthRoute } from '@/lib/post-auth-route';

const SPLASH_DURATION_MS = 2300;

export default function Index() {
  const { data: session, isPending } = useSession();
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashComplete(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isSplashComplete || isPending) {
    return <SplashScreen animate />;
  }

  if (session) {
    return <Redirect href={postAuthRoute(isEmailVerified(session))} />;
  }

  return <Redirect href="/onboarding" />;
}
