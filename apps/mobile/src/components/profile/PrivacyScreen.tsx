import { InlineNotice } from '@/components/forms';
import { goBackOrHome } from '@/lib/go-back';
import { SETTINGS_SAVE_FAILED_MESSAGE } from './constants/settings-copy';
import {
  SettingsGroup,
  SettingsInfoRow,
  SettingsSectionTitle,
  SettingsSwitchRow,
} from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import { useMe } from './useMe';
import { useNotificationSettings } from './useNotificationSettings';

/** One switch, then plain sentences about who sees what. */
export function PrivacyScreen() {
  const notifications = useNotificationSettings(useMe().data);

  return (
    <SettingsPage
      onBack={() => goBackOrHome('/settings')}
      testID="privacy-settings"
      title="Privacy"
    >
      {notifications.hasFailed ? (
        <InlineNotice icon="offline" message={SETTINGS_SAVE_FAILED_MESSAGE} tone="error" />
      ) : null}
      <SettingsGroup>
        <SettingsSwitchRow
          isBusy={notifications.isSaving}
          isOn={notifications.settings.showOnLeaderboard}
          label="Show me on the leaderboard"
          meta="Your name and this week’s points. Your points still count if this is off."
          onChange={(next) => void notifications.save({ showOnLeaderboard: next })}
          testID="toggle-show-on-leaderboard"
        />
      </SettingsGroup>

      <SettingsSectionTitle>Who sees what</SettingsSectionTitle>
      <SettingsGroup isSpaced={false}>
        <SettingsInfoRow
          glyph="trophy"
          label="Everyone on the leaderboard"
          meta="Your name and points this week"
        />
        <SettingsInfoRow
          glyph="users"
          label="People in your groups"
          meta="Your name, photo, and score in that group"
        />
        <SettingsInfoRow
          glyph="lock"
          label="Nobody"
          meta="Your conditions, readings, photos and full name"
        />
      </SettingsGroup>
    </SettingsPage>
  );
}
