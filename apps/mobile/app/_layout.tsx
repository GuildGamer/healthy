import { colors } from '@product/brand';
import { HeaderBackButton } from '@react-navigation/elements';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import {
  hideAsync,
  preventAutoHideAsync,
  setOptions,
} from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SplashScreen } from '@/components/auth';
import { ToastProvider } from '@/components/forms';
import { useDisplayFont } from '@/lib/fonts';
import { goBackOrHome } from '@/lib/go-back';

/**
 * Cross-fade out of the native splash, covering the handoff frame. iOS only —
 * Android cuts, which is unnoticeable because the icon does not move across it.
 */
const NATIVE_SPLASH_FADE_MS = 220;

/**
 * The native splash holds until the display font resolves, so the first thing
 * on screen is the animated `SplashScreen` at frame zero. Without this the
 * font gate below would flash a fully settled splash and then replay it.
 */
void preventAutoHideAsync();
setOptions({ duration: NATIVE_SPLASH_FADE_MS, fade: true });

export default function RootLayout() {
  const isDisplayFontReady = useDisplayFont();

  useEffect(() => {
    if (!isDisplayFontReady) {
      return;
    }

    void hideAsync();
  }, [isDisplayFontReady]);

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
            // iOS labels back with the previous screen's title, and the tabs
            // screen has none of its own — so every push off a tab offered
            // "Healthy", which names the app rather than the destination.
            headerBackTitle: 'Back',
            // A native pop is a no-op after a deep link or a redirect, and the
            // system button hides when it thinks there is nowhere to go. This
            // control is the left side of every visible root header (tab roots
            // and auth keep headerShown off and draw their own).
            headerBackVisible: false,
            headerLeft: ({ tintColor }) => (
              <HeaderBackButton
                label="Back"
                onPress={() => {
                  goBackOrHome();
                }}
                tintColor={tintColor}
              />
            ),
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="tips" options={{ title: 'Tips' }} />
          <Stack.Screen name="points" options={{ title: 'Points' }} />
          <Stack.Screen
            name="membership"
            options={{ headerShown: false, title: 'Membership' }}
          />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: false, title: 'Notifications' }}
          />
          <Stack.Screen
            name="health-categories"
            options={{ title: 'Health Categories' }}
          />
          <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
          <Stack.Screen
            name="change-email"
            options={{ headerShown: false, title: 'Change email' }}
          />
          <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
          <Stack.Screen
            name="manage-challenges"
            options={{ title: 'Manage challenges' }}
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
            name="challenge/[challengeId]/camera"
            options={{ headerShown: false, title: 'Camera' }}
          />
          <Stack.Screen
            name="challenge/[challengeId]/pose"
            options={{ headerShown: false, title: 'Push-ups' }}
          />
          <Stack.Screen
            name="challenge/[challengeId]/session"
            options={{ headerShown: false, title: 'Walk' }}
          />
          <Stack.Screen
            name="challenge/[challengeId]/practice"
            options={{ headerShown: false, title: 'Push-ups' }}
          />
          <Stack.Screen
            name="challenge/[challengeId]/verify"
            options={{ title: 'Photo check' }}
          />
          <Stack.Screen
            name="challenge/success"
            options={{ headerShown: false, title: 'Well done' }}
          />
          <Stack.Screen
            name="matches/index"
            options={{ title: 'Groups' }}
          />
          <Stack.Screen
            name="matches/create"
            options={{ title: 'Start a group' }}
          />
          <Stack.Screen
            name="matches/[matchId]"
            options={{ title: 'Group' }}
          />
          <Stack.Screen
            name="matches/[matchId]/pose"
            options={{ headerShown: false, title: 'Push-ups' }}
          />
          <Stack.Screen
            name="matches/[matchId]/walk"
            options={{ headerShown: false, title: 'Walk' }}
          />
          <Stack.Screen
            name="match/[token]"
            options={{ title: 'Group invite' }}
          />
        </Stack>
      </ToastProvider>
    </QueryClientProvider>
  );
}
