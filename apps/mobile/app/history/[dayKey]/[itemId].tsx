import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { DayActivityScreen } from '@/components/progress';
import { useSession } from '@/lib/auth-client';

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function HistoryActivityRoute() {
  const { data: session, isPending } = useSession();
  const { dayKey, itemId } = useLocalSearchParams<{ dayKey: string; itemId: string }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!dayKey || !DAY_KEY_PATTERN.test(dayKey) || !itemId) {
    return <Redirect href="/history" />;
  }

  return <DayActivityScreen dayKey={dayKey} itemId={itemId} />;
}
