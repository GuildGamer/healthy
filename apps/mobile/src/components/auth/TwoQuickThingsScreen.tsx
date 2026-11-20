import type { PublicMatchInvitePreview } from '@product/contract';
import type { CountryCode } from '@product/contract/country-code';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  CountrySheet,
  FormButton,
  InlineNotice,
  InsetField,
  InsetSelectField,
} from '@/components/forms';
import { apiClient } from '@/lib/api';
import { updateUser } from '@/lib/auth-client';
import { countryName, deviceCountryCode } from '@/lib/country';
import { type Theme, useThemedStyles } from '@/theme';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';
import { FieldError, FieldNote } from './FrontDoorText';
import {
  firstNameFrom,
  hasDisallowedCharacter,
  isValidPublicName,
  PUBLIC_NAME_MAX_LENGTH,
  PUBLIC_NAME_RULE,
} from '@/lib/public-name';

const NAME_USE_NOTE = 'Friends in your contests see this.';
const INVITE_NAME_USE: Record<PublicMatchInvitePreview['metric'], string> = {
  pushups: 'Friends see this with your push-ups. Nothing else about you is shown.',
  walk: 'Friends see this with your minutes walked. Nothing else about you is shown.',
  squats: 'Friends see this with your squats. Nothing else about you is shown.',
  plank: 'Friends see this with your plank time. Nothing else about you is shown.',
  jumping_jacks: 'Friends see this with your jumping jacks. Nothing else about you is shown.',
  burpees: 'Friends see this with your burpees. Nothing else about you is shown.',
  sit_ups: 'Friends see this with your sit-ups. Nothing else about you is shown.',
  mountain_climbers:
    'Friends see this with your mountain climbers. Nothing else about you is shown.',
  lunges: 'Friends see this with your lunges. Nothing else about you is shown.',
};

interface TwoQuickThingsScreenProps {
  /** The account name, if a provider supplied one. Only its first word is used. */
  accountName: string | null | undefined;
  /** From a group link: only the name is asked, and the rest waits. */
  invite: PublicMatchInvitePreview | null;
  onCompleted: () => Promise<void> | void;
}

/**
 * Right after the account exists: the name others see, and the country from
 * the phone. Each says where it is used. No way back, the account is made.
 */
export function TwoQuickThingsScreen({
  accountName,
  invite,
  onCompleted,
}: TwoQuickThingsScreenProps) {
  const styles = useThemedStyles(createStyles);
  const suggestedName = firstNameFrom(accountName);
  const [name, setName] = useState(suggestedName);
  const [hasLeftName, setHasLeftName] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode | null>(() => deviceCountryCode());
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const trimmedName = name.trim();
  const isNameValid = isValidPublicName(trimmedName);
  const showNameError =
    trimmedName.length > 0 && !isNameValid && (hasLeftName || hasDisallowedCharacter(trimmedName));
  const needsCountry = invite === null;
  const canContinue = isNameValid && (!needsCountry || countryCode !== null);

  async function save() {
    if (!canContinue || isSaving) {
      return;
    }

    setIsSaving(true);
    setHasFailed(false);
    try {
      await saveDetails({
        name: trimmedName,
        accountName,
        countryCode: needsCountry ? countryCode : null,
      });
      await onCompleted();
    } catch {
      setHasFailed(true);
    } finally {
      setIsSaving(false);
    }
  }

  const nameNote = invite
    ? INVITE_NAME_USE[invite.metric]
    : suggestedName
      ? `From your Google account. ${NAME_USE_NOTE}`
      : `${NAME_USE_NOTE} A first name or nickname is fine.`;

  return (
    <FrontDoorLayout
      dock={
        <FormButton
          disabled={!canContinue}
          label={invite ? `See ${invite.hostDisplayName}’s group` : 'Continue'}
          loading={isSaving}
          onPress={() => void save()}
          testID="complete-country-continue"
        />
      }
      testID="two-quick-things"
    >
      <FrontDoorTitle
        title={
          invite ? `What should ${invite.hostDisplayName}’s group call you?` : 'Two quick things'
        }
      />
      {hasFailed ? (
        <InlineNotice icon="offline" message={CONNECTION_FAILED_MESSAGE} tone="error" />
      ) : null}

      {invite ? null : <Text style={styles.question}>What should others call you?</Text>}
      <InsetField
        autoCapitalize="words"
        autoComplete="given-name"
        autoFocus={!suggestedName}
        containerStyle={styles.field}
        counter={showNameError ? `${trimmedName.length} of ${PUBLIC_NAME_MAX_LENGTH}` : undefined}
        hasError={showNameError}
        label="First name"
        maxLength={PUBLIC_NAME_MAX_LENGTH}
        onBlur={() => setHasLeftName(true)}
        onChangeText={setName}
        placeholder="First name"
        testID="complete-country-name"
        textContentType="givenName"
        value={name}
      />
      {showNameError ? (
        <FieldError>{PUBLIC_NAME_RULE}</FieldError>
      ) : (
        <FieldNote>{nameNote}</FieldNote>
      )}

      {needsCountry ? (
        <CountryQuestion countryCode={countryCode} onChange={setCountryCode} />
      ) : null}
    </FrontDoorLayout>
  );
}

function CountryQuestion({
  countryCode,
  onChange,
}: {
  countryCode: CountryCode | null;
  onChange: (code: CountryCode) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [isFromPhone, setIsFromPhone] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <Text style={styles.question}>Where are you?</Text>
      <InsetSelectField
        containerStyle={styles.field}
        label="Country"
        side={{
          label: countryCode ? 'Change' : 'Choose',
          onPress: () => setIsSheetOpen(true),
          testID: 'complete-country-picker',
        }}
        value={countryCode ? countryName(countryCode) : 'Not set'}
      />
      <FieldNote>
        {isFromPhone && countryCode ? 'From your phone. ' : ''}It sets prices for your region.
      </FieldNote>
      <CountrySheet
        onClose={() => setIsSheetOpen(false)}
        onSelect={(code) => {
          onChange(code);
          setIsFromPhone(false);
          setIsSheetOpen(false);
        }}
        testID="complete-country-picker"
        title="Where are you?"
        value={countryCode}
        visible={isSheetOpen}
      />
    </>
  );
}

/**
 * The public name goes to the profile. An email account has no account name
 * yet, so it takes the same one; a provider's full name stays private.
 */
async function saveDetails({
  name,
  accountName,
  countryCode,
}: {
  name: string;
  accountName: string | null | undefined;
  countryCode: CountryCode | null;
}): Promise<void> {
  if (!accountName?.trim()) {
    const { error } = await updateUser({ name });
    if (error) {
      throw new Error('Account name not saved');
    }
  }

  await apiClient.updateDisplayName({ displayName: name });
  if (countryCode) {
    await apiClient.updateCountry({ countryCode });
  }
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    question: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      marginTop: spacing.lg,
      marginHorizontal: spacing.xs,
    },
    field: {
      marginTop: spacing.sm,
    },
  });
