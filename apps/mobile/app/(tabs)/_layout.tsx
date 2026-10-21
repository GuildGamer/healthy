import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import { useRequestReminderOnLaunch } from '@/lib/use-request-reminder-on-launch';

/**
 * React Navigation draws `paddingBottom` inside `height`. A fixed 60pt bar
 * therefore spends the home-indicator inset on padding and leaves the labels
 * in the swipe zone. Keep that 60pt row, and grow the bar by the bottom inset
 * (a small floor when the device reports none) so the hit targets stay put.
 */
const TAB_BAR_BASE_HEIGHT = 60;
const TAB_BAR_MIN_BOTTOM_PADDING = spacing.sm;

export default function TabsLayout() {
  const { data: session, isPending, isRefetching } = useSession();
  const [gateHref, setGateHref] = useState<PostAuthHref | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!session) {
      setGateHref(null);
      return;
    }

    let cancelled = false;
    setIsResolving(true);
    void resolvePostAuthHref()
      .then((href) => {
        if (!cancelled) {
          setGateHref(href);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolving(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (isPending || (!session && isRefetching) || (session && (isResolving || !gateHref))) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (gateHref && gateHref !== '/(tabs)') {
    return <Redirect href={gateHref} />;
  }

  return <TabsShell />;
}

function TabsShell() {
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(
    insets.bottom,
    TAB_BAR_MIN_BOTTOM_PADDING,
  );
  useRequestReminderOnLaunch(true);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 4,
          paddingBottom: tabBarBottomPadding,
          height: TAB_BAR_BASE_HEIGHT + tabBarBottomPadding,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: fontWeight.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="list" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="activity" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-circle" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
