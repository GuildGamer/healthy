import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { DayShareScreen } from '@/components/home/DayShareScreen';
import { parseDayShareContent } from '@/components/home/day-share-route';
import { useSession } from '@/lib/auth-client';

export default function DayShareRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{
    weekday?: string;
    dateLabel?: string;
    completedCount?: string;
    totalCount?: string;
    pointsToday?: string;
    streakDays?: string;
  }>();
  const content = parseDayShareContent(params);

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!content) {
    return <Redirect href="/(tabs)" />;
  }

  return <DayShareScreen content={content} />;
}
