import { Redirect, useLocalSearchParams } from 'expo-router';
import { VerifyProofScreen } from '@/components/challenges/VerifyProofScreen';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function VerifyProofCodeRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{ code?: string | string[] }>();

  if (isPending) {
    return <ScreenLoader />;
  }
  if (!session) {
    return <Redirect href="/login" />;
  }

  return <VerifyProofScreen codeParam={firstParam(params.code)} />;
}
