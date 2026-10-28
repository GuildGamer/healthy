import { fontSize, fontWeight, spacing } from '@product/brand';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLoader } from '@/components/feedback';
import { Glyph, type GlyphName } from '@/components/icons';
import { useSession } from '@/lib/auth-client';
import type { PostAuthHref } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import {
  applyTabsGateResolve,
  clearCachedTabsGate,
  isTabsGateAllowed,
} from '@/lib/tabs-gate-cache';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

/**
 * React Navigation draws `paddingBottom` inside `height`. A fixed 60pt bar
 * therefore spends the home-indicator inset on padding and leaves the labels
 * in the swipe zone. Keep that 60pt row, and grow the bar by the bottom inset
 * (a small floor when the device reports none) so the hit targets stay put.
 */
const TAB_BAR_BASE_HEIGHT = 60;
const TAB_BAR_MIN_BOTTOM_PADDING = spacing.sm;

function seedGateHref(sessionUserId: string | undefined): PostAuthHref | null {
  if (!sessionUserId || !isTabsGateAllowed(sessionUserId)) {
    return null;
  }

  // Allowed means tabs — never re-seed a one-shot /match or onboarding href.
  return '/(tabs)';
}

export default function TabsLayout() {
  const { data: session, isPending, isRefetching } = useSession();
  const sessionUserId = session?.user.id;
  const [gateHref, setGateHref] = useState<PostAuthHref | null>(() => seedGateHref(sessionUserId));

  useEffect(() => {
    if (sessionUserId) {
      // Index already resolved and marked this user — do not pay for /me again.
      if (isTabsGateAllowed(sessionUserId)) {
        setGateHref('/(tabs)');
        return;
      }

      let cancelled = false;
      void resolvePostAuthHref().then((href) => {
        if (cancelled || !href) {
          return;
        }

        // Invite / onboarding: Redirect once for this mount only — do not cache.
        applyTabsGateResolve(sessionUserId, href);
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

const createTabLabelStyles = (theme: Theme) =>
  StyleSheet.create({
    label: {
      alignItems: 'center',
      gap: 3,
    },
    text: {
      fontSize: 10,
      fontWeight: fontWeight.medium,
    },
    openDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.accent,
    },
    closedDot: {
      width: 4,
      height: 4,
    },
  });

function TabLabel({ focused, color, title }: { focused: boolean; color: string; title: string }) {
  const styles = useThemedStyles(createTabLabelStyles);

  return (
    <View style={styles.label}>
      <Text style={[styles.text, { color }]}>{title}</Text>
      <View style={focused ? styles.openDot : styles.closedDot} />
    </View>
  );
}

function tabGlyph(closed: GlyphName, open: GlyphName, cutoutColor: string) {
  return function TabGlyph({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: string;
    size: number;
  }) {
    return (
      <Glyph color={color} cutoutColor={cutoutColor} name={focused ? open : closed} size={size} />
    );
  };
}

function tabLabel(title: string) {
  return function TabTitle({ focused, color }: { focused: boolean; color: string }) {
    return <TabLabel color={color} focused={focused} title={title} />;
  };
}

function TabsShell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_PADDING);

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
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerShown: false,
          tabBarIcon: tabGlyph('today', 'todayFilled', colors.surface),
          tabBarLabel: tabLabel('Today'),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          headerShown: false,
          tabBarIcon: tabGlyph('challenges', 'challengesFilled', colors.surface),
          tabBarLabel: tabLabel('Challenges'),
        }}
      />
      {/* Points history lives under You; the route stays for old links. */}
      <Tabs.Screen name="activity" options={{ title: 'Activity', href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          headerShown: false,
          tabBarIcon: tabGlyph('you', 'youFilled', colors.surface),
          tabBarLabel: tabLabel('You'),
        }}
      />
    </Tabs>
  );
}
