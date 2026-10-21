import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLoader } from '@/components/feedback';
import { ProfileAvatar, avatarNameFor } from '@/components/profile/ProfileAvatar';
import { useSession } from '@/lib/auth-client';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import {
  clearCachedTabsGate,
  getCachedTabsGate,
  setCachedTabsGate,
} from '@/lib/tabs-gate-cache';
import { useRequestReminderOnLaunch } from '@/lib/use-request-reminder-on-launch';

/**
 * React Navigation draws `paddingBottom` inside `height`. A fixed 60pt bar
 * therefore spends the home-indicator inset on padding and leaves the labels
 * in the swipe zone. Keep that 60pt row, and grow the bar by the bottom inset
 * (a small floor when the device reports none) so the hit targets stay put.
 */
const TAB_BAR_BASE_HEIGHT = 60;
const TAB_BAR_MIN_BOTTOM_PADDING = spacing.sm;

function seedGateHref(sessionUserId: string | undefined): PostAuthHref | null {
  if (!sessionUserId) {
    return null;
  }

  return getCachedTabsGate(sessionUserId);
}

export default function TabsLayout() {
  const { data: session, isPending, isRefetching } = useSession();
  const sessionUserId = session?.user.id;
  const [gateHref, setGateHref] = useState<PostAuthHref | null>(() =>
    seedGateHref(sessionUserId),
  );

  useEffect(() => {
    if (sessionUserId) {
      const cached = getCachedTabsGate(sessionUserId);
      if (cached) {
        setGateHref(cached);
      }

      let cancelled = false;
      void resolvePostAuthHref().then((href) => {
        if (cancelled || !href) {
          return;
        }

        setCachedTabsGate(sessionUserId, href);
        setGateHref(href);
      });

      return () => {
        cancelled = true;
      };
    }

    // Only clear when the session is definitively gone — not during refetch flicker.
    if (!session && !isPending && !isRefetching) {
      clearCachedTabsGate();
      setGateHref(null);
    }

    return undefined;
  }, [sessionUserId, session, isPending, isRefetching]);

  // Cold bootstrap only — never tear down Tabs once we have a gate for this user.
  if (((isPending || isRefetching) && !session) || (session && !gateHref)) {
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

function ProfileTabIcon({ size }: { size: number }) {
  const { data: session } = useSession();
  const name = avatarNameFor({
    displayName: session?.user.name,
    name: session?.user.name,
  });

  return (
    <ProfileAvatar
      imageUri={session?.user.image}
      name={name}
      size={size}
      testID="profile-tab-avatar"
    />
  );
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
          tabBarIcon: ({ size }) => <ProfileTabIcon size={size} />,
        }}
      />
    </Tabs>
  );
}
