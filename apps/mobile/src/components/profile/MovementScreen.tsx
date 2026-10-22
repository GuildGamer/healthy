import { fontSize, fontWeight, spacing } from '@product/brand';
import type { HealthLinkStatus } from '@product/client';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { DeckButton } from '@/components/deck';
import { InlineNotice } from '@/components/forms';
import { useHealthLink } from '@/components/health/useHealthLink';
import { Glyph } from '@/components/icons';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { SettingsGroup, SettingsNote, SettingsSectionTitle } from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import { useMe } from './useMe';

const HERO_TILE_SIZE = 64;

/** What it reads and what it never does, then one way to allow it. Walks still work by hand. */
export function MovementScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const status = useMe().data?.healthLinkStatus ?? 'unknown';
  const leave = () => goBackOrHome('/settings');
  const healthLink = useHealthLink();

  return (
    <SettingsPage
      dock={<MovementDock healthLink={healthLink} onNotNow={leave} status={status} />}
      onBack={leave}
      testID="movement-settings"
      title="Movement & watch"
    >
      <View style={styles.hero}>
        <View style={styles.tile}>
          <Glyph color={colors.text} name="walk" size={30} strokeWidth={2} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Count walks for you.
        </Text>
        <Text style={styles.sub}>
          Allow motion and location so this phone can count steps and record walks you start. Apple
          Health or Health Connect can add your watch workouts.
        </Text>
      </View>
      {healthLink.errorMessage ? (
        <InlineNotice icon="offline" message={healthLink.errorMessage} tone="error" />
      ) : null}
      <SettingsSectionTitle>What we read</SettingsSectionTitle>
      <SettingsGroup isSpaced={false}>
        <Text style={styles.read}>
          Steps, workouts, and the route of a walk you start in the app. You confirm before anything
          is marked done.
        </Text>
      </SettingsGroup>
    </SettingsPage>
  );
}

function MovementDock({
  status,
  healthLink,
  onNotNow,
}: {
  status: HealthLinkStatus;
  healthLink: ReturnType<typeof useHealthLink>;
  onNotNow: () => void;
}) {
  const openPhoneSettings = () => void Linking.openSettings();

  if (status === 'connected') {
    return (
      <>
        <SettingsNote centered>Connected on this phone.</SettingsNote>
        <DeckButton
          label="Open phone settings"
          onPress={openPhoneSettings}
          testID="open-phone-settings"
          variant="quiet"
        />
      </>
    );
  }

  return (
    <>
      <DeckButton
        label="Allow motion & location"
        loading={healthLink.isSaving}
        onPress={healthLink.allow}
        testID="connect-health"
      />
      {status === 'denied' ? (
        <DeckButton
          label="Open phone settings"
          onPress={openPhoneSettings}
          testID="open-phone-settings"
          variant="quiet"
        />
      ) : (
        <DeckButton
          label="Not now"
          onPress={() => {
            healthLink.decline();
            onNotNow();
          }}
          testID="skip-health"
          variant="quiet"
        />
      )}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      alignItems: 'center',
      marginTop: 30,
    },
    tile: {
      width: HERO_TILE_SIZE,
      height: HERO_TILE_SIZE,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      marginTop: 18,
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.75,
      textAlign: 'center',
    },
    sub: {
      maxWidth: 300,
      marginTop: spacing.sm,
      color: theme.colors.muted,
      fontSize: 14.5,
      lineHeight: 21,
      textAlign: 'center',
    },
    read: {
      paddingVertical: 12,
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
