import { Redirect, Stack } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';
import { useTheme } from '@/theme';

/** Every page under Settings is signed-in only; one guard covers them all. */
export default function SettingsLayout() {
  const { colors } = useTheme();
  const { data: session, isPending } = useSession();

  if (isPending && !session) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
