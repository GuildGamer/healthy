import { fontSize, fontWeight, spacing } from '@product/brand';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { DeckButton } from '@/components/deck';
import { FormButton, InlineNotice } from '@/components/forms';
import { Glyph, type GlyphName } from '@/components/icons';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { membershipStoreName, refusalLink, refusalMessage } from './account-deletion';
import { SettingsPage } from './SettingsPage';
import { useDeleteAccount } from './useDeleteAccount';

const leave = () => goBackOrHome('/settings/account');

/** A full page, not a pop-up: exactly what goes, what stays anonymous, and what to cancel first. */
export function DeleteAccountScreen() {
  const styles = useThemedStyles(createStyles);
  const deletion = useDeleteAccount();
  const cancelLink = deletion.refusal ? refusalLink(deletion.refusal) : null;

  return (
    <SettingsPage
      dock={
        <>
          <FormButton
            label="Delete my account"
            loading={deletion.isDeleting}
            onPress={deletion.deleteAccount}
            testID="confirm-delete-account"
            variant="danger"
          />
          <DeckButton
            label="Keep my account"
            onPress={leave}
            testID="keep-account"
            variant="quiet"
          />
        </>
      }
      onBack={leave}
      testID="delete-account-screen"
      title="Delete account"
    >
      <Text accessibilityRole="header" style={styles.title}>
        Delete your account?
      </Text>
      <Text style={styles.sub}>This can’t be undone.</Text>
      {deletion.refusal ? (
        <InlineNotice icon="star" message={refusalMessage(deletion.refusal)} tone="warning" />
      ) : null}
      {cancelLink ? (
        <DeckButton
          label={cancelLink.label}
          onPress={() => void Linking.openURL(cancelLink.url).catch(() => undefined)}
          testID="open-store-subscriptions"
          variant="quiet"
        />
      ) : null}
      {deletion.failureMessage ? (
        <InlineNotice icon="offline" message={deletion.failureMessage} tone="error" />
      ) : null}
      <View style={styles.list}>
        <WhatHappensRow
          detail="Your name, email, photo and sign-in go too."
          glyph="history"
          title="Your readings, logs and reminders are deleted."
        />
        <WhatHappensRow
          detail="Finished results keep your score as “Former member”, with no name or photo."
          glyph="users"
          title="You leave every group."
        />
        <WhatHappensRow
          detail={`Cancel it in ${membershipStoreName(Platform.OS)} first, or it keeps renewing.`}
          glyph="star"
          title="Membership isn’t cancelled for you."
        />
      </View>
    </SettingsPage>
  );
}

function WhatHappensRow({
  glyph,
  title,
  detail,
}: {
  glyph: GlyphName;
  title: string;
  detail: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View accessible style={styles.row}>
      <Glyph color={colors.text} name={glyph} size={18} strokeWidth={2} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      marginTop: 18,
      paddingHorizontal: spacing.xs,
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.75,
    },
    sub: {
      marginTop: 6,
      paddingHorizontal: spacing.xs,
      color: theme.colors.muted,
      fontSize: 14.5,
    },
    list: {
      marginTop: 14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      color: theme.colors.text,
      fontSize: 14.5,
      lineHeight: 20,
    },
    rowDetail: {
      marginTop: 2,
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
