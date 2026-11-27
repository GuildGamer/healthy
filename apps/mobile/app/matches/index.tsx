import { spacing } from '@product/brand';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckNavButton, DeckPageNav } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { MatchesListScreen } from '@/components/matches/MatchesListScreen';
import { useSession } from '@/lib/auth-client';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';

export default function MatchesRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.nav}>
        <DeckPageNav
          onBack={() => goBackOrHome('/(tabs)/challenges')}
          right={
            <DeckNavButton
              accessibilityLabel="Start a group"
              glyph="plus"
              onPage
              onPress={() => router.navigate('/matches/create')}
              testID="matches-create"
            />
          }
          title="Groups"
        />
      </View>
      <MatchesListScreen />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    nav: {
      paddingHorizontal: 20,
    },
  });
