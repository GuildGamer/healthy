import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { InlineNotice } from '@/components/forms';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { useNotificationPermission } from '@/lib/use-notification-permission';
import {
  PHOTO_CHECKS_OFF_CONFIRM_BODY,
  SETTINGS_SAVE_FAILED_MESSAGE,
} from './constants/settings-copy';
import { nudgeDelaySummary } from './nudge-delay';
import { NudgeDelaySheet } from './NudgeDelaySheet';
import { PhoneNotificationsOffBanner } from './PhoneNotificationsOffBanner';
import {
  SettingsActionSheet,
  SettingsGroup,
  SettingsLinkRow,
  SettingsSectionTitle,
  SettingsSwitchRow,
} from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import { useMe } from './useMe';
import { useNotificationSettings } from './useNotificationSettings';

type NotificationSettings = ReturnType<typeof useNotificationSettings>;

function remindersMeta(reminderCount: number | null): string {
  if (!reminderCount) {
    return 'At the times you choose on each challenge';
  }

  return `${reminderCount} set, at the times you choose on each challenge`;
}

function useReminderCount(): number | null {
  const catalog = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
  }).data;

  if (!catalog) {
    return null;
  }

  return catalog.challenges.reduce((total, challenge) => total + challenge.reminders.length, 0);
}

/** Grouped by who is talking: your challenges, your groups, then us. */
export function NotificationSettingsScreen() {
  const notifications = useNotificationSettings(useMe().data);
  const { settings, save } = notifications;
  const isBlocked = useNotificationPermission() === 'denied';

  return (
    <SettingsPage
      onBack={() => goBackOrHome('/settings')}
      testID="notification-settings"
      title="Notifications"
    >
      {isBlocked ? <PhoneNotificationsOffBanner /> : null}
      {notifications.hasFailed ? (
        <InlineNotice icon="offline" message={SETTINGS_SAVE_FAILED_MESSAGE} tone="error" />
      ) : null}

      <SettingsSectionTitle>From your challenges</SettingsSectionTitle>
      <ChallengeNotificationsGroup isBlocked={isBlocked} notifications={notifications} />

      <SettingsSectionTitle>From your groups</SettingsSectionTitle>
      <SettingsGroup isSpaced={false}>
        <SettingsSwitchRow
          isDimmed={isBlocked}
          isOn={settings.groupNotificationsEnabled}
          label="Cheers, nudges and results"
          meta="Cheers, nudges, board moves and joins. They stay in your inbox if this is off."
          onChange={(next) => void save({ groupNotificationsEnabled: next })}
          testID="toggle-group-notifications"
        />
      </SettingsGroup>

      <SettingsSectionTitle>From us</SettingsSectionTitle>
      <SettingsGroup isSpaced={false}>
        <SettingsSwitchRow
          isDimmed={isBlocked}
          isOn={settings.promotionalMessagesEnabled}
          label="News and offers"
          meta="A few times a month"
          onChange={(next) => void save({ promotionalMessagesEnabled: next })}
          testID="toggle-promotional-messages"
        />
      </SettingsGroup>
    </SettingsPage>
  );
}

function ChallengeNotificationsGroup({
  notifications,
  isBlocked,
}: {
  notifications: NotificationSettings;
  isBlocked: boolean;
}) {
  const { settings, save } = notifications;
  const reminderCount = useReminderCount();
  const [isPhotoChecksConfirmOpen, setIsPhotoChecksConfirmOpen] = useState(false);

  return (
    <>
      <SettingsGroup isSpaced={false}>
        <SettingsSwitchRow
          isBusy={notifications.isSaving}
          isDimmed={isBlocked}
          isOn={settings.reminderEnabled}
          label="Reminders"
          meta={remindersMeta(reminderCount)}
          onChange={(next) => void save({ reminderEnabled: next })}
          testID="toggle-daily-reminders"
        />
        <SettingsSwitchRow
          isDimmed={isBlocked}
          isOn={settings.evidenceRemindersEnabled}
          label="Photo checks"
          meta="Checks still happen if this is off. Missing one costs points."
          onChange={(next) =>
            next ? void save({ evidenceRemindersEnabled: true }) : setIsPhotoChecksConfirmOpen(true)
          }
          testID="toggle-evidence-reminders"
        />
        <FinishWhatYouStartedRow isBlocked={isBlocked} notifications={notifications} />
      </SettingsGroup>
      <SettingsActionSheet
        actions={[
          {
            label: 'Turn off',
            isDestructive: true,
            onPress: () => {
              setIsPhotoChecksConfirmOpen(false);
              void save({ evidenceRemindersEnabled: false });
            },
            testID: 'confirm-photo-checks-off',
          },
        ]}
        body={PHOTO_CHECKS_OFF_CONFIRM_BODY}
        onCancel={() => setIsPhotoChecksConfirmOpen(false)}
        testID="photo-checks-off-sheet"
        title="Turn off photo check alerts?"
        visible={isPhotoChecksConfirmOpen}
      />
    </>
  );
}

/** Members get a switch and a wait; a free account sees a Members tag, never a dead switch. */
function FinishWhatYouStartedRow({
  notifications,
  isBlocked,
}: {
  notifications: NotificationSettings;
  isBlocked: boolean;
}) {
  const router = useRouter();
  const { settings, save } = notifications;
  const [isDelaySheetOpen, setIsDelaySheetOpen] = useState(false);

  if (!notifications.hasMembership) {
    return (
      <SettingsLinkRow
        isDimmed={isBlocked}
        label="Finish what you started"
        meta="A nudge if you leave a log unfinished"
        onPress={() => router.push({ pathname: '/membership', params: { source: 'profile' } })}
        tag="Members"
        testID="toggle-in-progress-nudge"
      />
    );
  }

  return (
    <>
      <SettingsSwitchRow
        isDimmed={isBlocked}
        isOn={settings.inProgressNudgeEnabled}
        label="Finish what you started"
        meta={nudgeDelaySummary(settings.inProgressNudgeDelayMinutes)}
        onChange={(next) => void save({ inProgressNudgeEnabled: next })}
        onMetaPress={() => setIsDelaySheetOpen(true)}
        testID="toggle-in-progress-nudge"
      />
      {isDelaySheetOpen ? (
        <NudgeDelaySheet
          onClose={() => setIsDelaySheetOpen(false)}
          onDone={(minutes) => {
            setIsDelaySheetOpen(false);
            if (minutes !== settings.inProgressNudgeDelayMinutes) {
              void save({ inProgressNudgeDelayMinutes: minutes });
            }
          }}
          savedMinutes={settings.inProgressNudgeDelayMinutes}
        />
      ) : null}
    </>
  );
}
