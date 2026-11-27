import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { PeriodShareScreen } from '@/components/progress/PeriodShareScreen';
import {
  onDayFromParam,
  reportPeriodFromParam,
} from '@/components/progress/period-report-route';
import { useSession } from '@/lib/auth-client';

export default function PeriodShareRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{ period?: string; on?: string }>();
  const period = reportPeriodFromParam(params.period);
  const onDay = onDayFromParam(params.on);

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <PeriodShareScreen onDay={onDay} period={period} />;
}
