import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MetricShareScreen } from '@/components/progress/MetricShareScreen';
import {
  metricFromParam,
  statsPeriodFromParam,
} from '@/components/progress/metric-stats-route';
import { useSession } from '@/lib/auth-client';

export default function MetricShareRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{ metric?: string; period?: string }>();
  const metric = metricFromParam(params.metric);
  const period = statsPeriodFromParam(params.period);

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!metric) {
    return <Redirect href="/progress/reports" />;
  }

  return <MetricShareScreen metric={metric} period={period} />;
}
