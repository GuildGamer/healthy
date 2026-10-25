import { fontSize, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InlineNotice, InsetField } from '@/components/forms';
import { useSession } from '@/lib/auth-client';
import { goBackOrHome } from '@/lib/go-back';
import { PUBLIC_NAME_MAX_LENGTH, PUBLIC_NAME_RULE } from '@/lib/public-name';
import { type Theme, useThemedStyles } from '@/theme';
import {
  PRIVATE_DETAILS_NOTE,
  PUBLIC_NAME_NOTE,
  SETTINGS_SAVE_FAILED_MESSAGE,
} from './constants/settings-copy';
import { FullNameSheet } from './FullNameSheet';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfilePhotoPreviewModal } from './ProfilePhotoPreviewModal';
import { ProfilePhotoSheet } from './ProfilePhotoSheet';
import {
  SettingsGroup,
  SettingsLinkRow,
  SettingsNote,
  SettingsSectionTitle,
} from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import { useMe } from './useMe';
import { usePublicNameDraft } from './usePublicNameDraft';
import { useUpdateProfilePhoto } from './useUpdateProfilePhoto';

const PROFILE_AVATAR_SIZE = 96;

/** What others see comes first; the full name sits apart under Private. */
export function ProfileDetailsScreen() {
  const styles = useThemedStyles(createStyles);
  const { data: session } = useSession();
  const me = useMe().data;
  const savedPublicName = me?.displayName ?? '';
  const fullName = me?.name ?? session?.user.name ?? '';
  const publicName = usePublicNameDraft(savedPublicName);
  const photo = useUpdateProfilePhoto();
  const photoUri = session?.user.image ?? null;
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isFullNameOpen, setIsFullNameOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <SettingsPage
      navRight={
        publicName.isChanged ? (
          <SaveAction isEnabled={publicName.canSave} onPress={publicName.save} />
        ) : null
      }
      onBack={() => goBackOrHome('/settings')}
      testID="edit-profile-screen"
      title="Profile"
    >
      <View style={styles.avatar}>
        <ProfileAvatar
          imageUri={photoUri}
          name={savedPublicName || fullName}
          onEditPress={photo.openSheet}
          onPreviewPress={photoUri ? () => setIsPreviewOpen(true) : undefined}
          size={PROFILE_AVATAR_SIZE}
          testID="profile-avatar"
        />
      </View>
      {photo.isSaving ? <SettingsNote centered>Saving your photo…</SettingsNote> : null}
      {photo.errorMessage ? (
        <InlineNotice icon="camera" message={photo.errorMessage} tone="error" />
      ) : null}
      {publicName.hasFailed ? (
        <InlineNotice icon="offline" message={SETTINGS_SAVE_FAILED_MESSAGE} tone="error" />
      ) : null}

      <SettingsSectionTitle>What others see</SettingsSectionTitle>
      <InsetField
        autoCapitalize="words"
        autoCorrect={false}
        counter={isNameFocused || publicName.isInvalid ? publicName.counter : undefined}
        hasError={publicName.isInvalid}
        label="Leaderboard name"
        maxLength={PUBLIC_NAME_MAX_LENGTH}
        onBlur={() => setIsNameFocused(false)}
        onChangeText={publicName.setValue}
        onFocus={() => setIsNameFocused(true)}
        onSubmitEditing={publicName.save}
        returnKeyType="done"
        testID="display-name-input"
        value={publicName.value}
      />
      {publicName.isInvalid ? (
        <SettingsNote testID="display-name-error" tone="error">
          {PUBLIC_NAME_RULE}
        </SettingsNote>
      ) : (
        <SettingsNote>{PUBLIC_NAME_NOTE}</SettingsNote>
      )}

      <SettingsSectionTitle>Private</SettingsSectionTitle>
      <SettingsGroup isSpaced={false}>
        <SettingsLinkRow
          label="Account name"
          onPress={() => setIsFullNameOpen(true)}
          testID="open-full-name"
          value={fullName}
        />
      </SettingsGroup>
      <SettingsNote>{PRIVATE_DETAILS_NOTE}</SettingsNote>

      <ProfilePhotoSheet hasPhoto={photoUri !== null} photo={photo} />
      {isFullNameOpen ? (
        <FullNameSheet onClose={() => setIsFullNameOpen(false)} savedName={fullName} visible />
      ) : null}
      {photoUri ? (
        <ProfilePhotoPreviewModal
          imageUri={photoUri}
          onClose={() => setIsPreviewOpen(false)}
          visible={isPreviewOpen}
        />
      ) : null}
    </SettingsPage>
  );
}

/** Appears once the name has changed, and stays grey until it passes the rule. */
function SaveAction({ isEnabled, onPress }: { isEnabled: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !isEnabled }}
      disabled={!isEnabled}
      hitSlop={12}
      onPress={onPress}
      testID="display-name-save"
    >
      <Text style={[styles.save, isEnabled ? null : styles.saveOff]}>Save</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    avatar: {
      alignItems: 'center',
      marginTop: spacing.md,
    },
    save: {
      color: theme.colors.accent,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    saveOff: {
      color: theme.colors.muted,
      fontWeight: fontWeight.medium,
    },
  });
