import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { DayDetailScreen } from '@/components/progress';
import { useSession } from '@/lib/auth-client';

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function HistoryDayRoute() {
  const { data: session, isPending } = useSession();
  const { dayKey } = useLocalSearchParams<{ dayKey: string }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!dayKey || !DAY_KEY_PATTERN.test(dayKey)) {
    return <Redirect href="/history" />;
  }

  return <DayDetailScreen dayKey={dayKey} />;
}
