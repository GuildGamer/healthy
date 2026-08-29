import { colors } from '@product/brand';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SplashScreen } from '@/components/auth';
import { ToastProvider } from '@/components/forms';
import { useDisplayFont } from '@/lib/fonts';

export default function RootLayout() {
  const isDisplayFontReady = useDisplayFont();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  if (!isDisplayFontReady) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
            title: 'Healthy',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="tips" options={{ title: 'Health Tips' }} />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: false, title: 'Notifications' }}
          />
          <Stack.Screen
            name="health-categories"
            options={{ title: 'Health Categories' }}
          />
          <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
          <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
          <Stack.Screen
            name="manage-challenges"
            options={{ title: 'Add challenges' }}
          />
          <Stack.Screen
            name="challenge/[challengeId]/index"
            options={{ title: 'Challenge' }}
          />
          <Stack.Screen
            name="challenge/[challengeId]/log"
            options={{ title: 'Log reading' }}
          />
          <Stack.Screen
            name="challenge/[challengeId]/evidence"
            options={{ title: 'Gym photo' }}
          />
          <Stack.Screen
            name="challenge/[challengeId]/verify"
            options={{ title: 'Photo check' }}
          />
          <Stack.Screen
            name="challenge/success"
            options={{ headerShown: false, title: 'Well done' }}
          />
        </Stack>
      </ToastProvider>
    </QueryClientProvider>
  );
}
