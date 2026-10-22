import { HeaderBackButton } from '@react-navigation/elements';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { hideAsync, preventAutoHideAsync, setOptions } from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { NATIVE_SPLASH_FADE_MS, SplashScreen } from '@/components/auth';
import { ToastProvider } from '@/components/forms';
import {
  DECK_SHEET_SCREEN_OPTIONS,
  FULL_PHONE_SCREEN_OPTIONS,
} from '@/components/navigation/screen-options';
import { useDisplayFont } from '@/lib/fonts';
import { goBackOrHome } from '@/lib/go-back';
import { useHasLeftLaunchRoute } from '@/lib/use-has-left-launch-route';
import { usePushResponse } from '@/lib/use-push-response';
import { ThemeProvider, useTheme } from '@/theme';

/**
 * The native splash holds until the display font resolves, so the first thing
 * on screen is `SplashScreen`, already in place under the native one.
 */
void preventAutoHideAsync();
setOptions({ duration: NATIVE_SPLASH_FADE_MS, fade: true });

export default function RootLayout() {
  const isDisplayFontReady = useDisplayFont();
  const hasLeftLaunchRoute = useHasLeftLaunchRoute();
  const [hasSplashExited, setHasSplashExited] = useState(false);
  usePushResponse();

  // `index` resolves the session and redirects; a deep link that never
  // visits it is ready as soon as the font is.
  const isLaunchReady = isDisplayFontReady && hasLeftLaunchRoute;
  const markSplashExited = useCallback(() => setHasSplashExited(true), []);

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

  return (
    <ThemeProvider>
      {isDisplayFontReady ? (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RootStack />
          </ToastProvider>
        </QueryClientProvider>
      ) : null}
      {hasSplashExited ? null : (
        <SplashScreen
          hasNativeSplashHidden={isDisplayFontReady}
          isReady={isLaunchReady}
          onExited={markSplashExited}
        />
      )}
    </ThemeProvider>
  );
}

function RootStack() {
  const { colors } = useTheme();

  return (
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
      <Stack.Screen name="tips" options={{ headerShown: false, title: 'Tips' }} />
      <Stack.Screen name="points" options={{ headerShown: false, title: 'History' }} />
      <Stack.Screen name="history/index" options={{ headerShown: false, title: 'History' }} />
      <Stack.Screen name="history/[dayKey]" options={{ headerShown: false, title: 'Day' }} />
      <Stack.Screen name="membership" options={{ headerShown: false, title: 'Membership' }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, title: 'Notifications' }} />
      <Stack.Screen name="settings" options={{ headerShown: false, title: 'Settings' }} />
      <Stack.Screen name="leaderboard" options={{ headerShown: false, title: 'This week' }} />
      <Stack.Screen
        name="manage-challenges"
        options={{ headerShown: false, title: 'Add a challenge' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/index"
        options={{ headerShown: false, title: 'Challenge' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/history"
        options={{ headerShown: false, title: 'History' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/log"
        options={{ ...DECK_SHEET_SCREEN_OPTIONS, title: 'Log reading' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/confirm"
        options={{ ...DECK_SHEET_SCREEN_OPTIONS, title: 'Mark as done' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/verify"
        options={{ ...DECK_SHEET_SCREEN_OPTIONS, title: 'Photo check' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/evidence"
        options={{ ...FULL_PHONE_SCREEN_OPTIONS, title: 'Gym photo' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/pose"
        options={{ ...FULL_PHONE_SCREEN_OPTIONS, title: 'Push-ups' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/session"
        options={{ ...FULL_PHONE_SCREEN_OPTIONS, title: 'Walk' }}
      />
      <Stack.Screen
        name="challenge/[challengeId]/practice"
        options={{ ...FULL_PHONE_SCREEN_OPTIONS, title: 'Push-ups' }}
      />
      <Stack.Screen
        name="challenge/share"
        options={{ headerShown: false, presentation: 'fullScreenModal', title: 'Share' }}
      />
      <Stack.Screen name="challenge/success" options={{ headerShown: false, title: 'Well done' }} />
      <Stack.Screen name="matches/index" options={{ headerShown: false, title: 'Groups' }} />
      <Stack.Screen
        name="matches/create"
        options={{ headerShown: false, title: 'Start a group' }}
      />
      <Stack.Screen name="matches/past" options={{ headerShown: false, title: 'Past groups' }} />
      <Stack.Screen name="matches/[matchId]" options={{ headerShown: false, title: 'Group' }} />
      <Stack.Screen
        name="matches/[matchId]/result"
        options={{ headerShown: false, title: 'Result' }}
      />
      <Stack.Screen
        name="matches/[matchId]/pose"
        options={{ headerShown: false, title: 'Push-ups' }}
      />
      <Stack.Screen name="matches/[matchId]/walk" options={{ headerShown: false, title: 'Walk' }} />
      <Stack.Screen name="match/[token]" options={{ headerShown: false, title: 'Group invite' }} />
    </Stack>
  );
}
