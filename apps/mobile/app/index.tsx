import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { SplashScreen } from '@/components/auth';
import { useSession } from '@/lib/auth-client';

const SPLASH_DURATION_MS = 2000;

export default function Index() {
  const { data: session, isPending } = useSession();
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashComplete(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isSplashComplete || isPending) {
    return <SplashScreen />;
  }

  if (session) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/onboarding" />;
}
