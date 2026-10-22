import Constants from 'expo-constants';
import { Linking } from 'react-native';
import { canOpenWriteReviewPage, openWriteReviewPage } from '@/lib/app-review';
import { PRIVACY_URL, TERMS_URL } from '@/lib/config';
import { goBackOrHome } from '@/lib/go-back';
import { SUPPORT_EMAIL } from './constants/settings-copy';
import { SettingsGroup, SettingsLinkRow, SettingsNote } from '@/components/settings';
import { SettingsPage } from './SettingsPage';

function openUrl(url: string) {
  void Linking.openURL(url).catch(() => undefined);
}

/** Four rows and the version. Rate the app only where the store supports it. */
export function HelpScreen() {
  const version = Constants.expoConfig?.version;

  return (
    <SettingsPage
      onBack={() => goBackOrHome('/settings')}
      testID="help-settings"
      title="Help and feedback"
    >
      <SettingsGroup>
        <SettingsLinkRow
          glyph="mail"
          label="Contact us"
          meta="Opens an email to the team"
          onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
          testID="open-contact"
        />
        {canOpenWriteReviewPage() ? (
          <SettingsLinkRow
            glyph="star"
            label="Rate the app"
            onPress={() => void openWriteReviewPage()}
            testID="open-rate-app"
          />
        ) : null}
      </SettingsGroup>
      <SettingsGroup>
        <SettingsLinkRow
          glyph="lock"
          label="Privacy policy"
          onPress={() => openUrl(PRIVACY_URL)}
          testID="open-privacy-policy"
        />
        <SettingsLinkRow
          glyph="doc"
          label="Terms"
          onPress={() => openUrl(TERMS_URL)}
          testID="open-terms"
        />
      </SettingsGroup>
      {version ? <SettingsNote centered>{`Healthy ${version}`}</SettingsNote> : null}
    </SettingsPage>
  );
}
