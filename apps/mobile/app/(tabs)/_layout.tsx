import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight } from '@product/brand';
import { Redirect, Tabs } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { useSession } from '@/lib/auth-client';

export default function TabsLayout() {
  const { data: session, isPending, isRefetching } = useSession();

  if (isPending || (!session && isRefetching)) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

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
          height: 60,
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
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="user" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
