import type { PublicMatchInvitePreview } from '@product/contract';
import { spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import { ScreenLoader } from '@/components/feedback';
import { InlineNotice } from '@/components/forms';
import { DeckCard } from './DeckCard';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';
import { FieldNote, SwitchLink, TermsLine } from './FrontDoorText';
import { inviteDeckCard, inviteJoinLine, invitePrivacyNote } from './invite-copy';
import { EmailAuthButton, GoogleAuthButton } from './SocialAuthButton';
import { useGoogleSignIn } from './use-google-sign-in';
import { usePendingInvite } from './use-pending-sign-up';
import { WelcomeDeck } from './WelcomeDeck';

interface CreateAccountScreenProps {
  onEmailPress: () => void;
  onLoginPress: () => void;
  onSignedIn: () => Promise<void> | void;
}

/**
 * The first screen: making the account comes before anything else, so it is
 * the one thing asked. Arriving from a group link, it is about the group.
 */
export function CreateAccountScreen({
  onEmailPress,
  onLoginPress,
  onSignedIn,
}: CreateAccountScreenProps) {
  const google = useGoogleSignIn(onSignedIn);
  const pendingInvite = usePendingInvite();

  if (pendingInvite.isPending) {
    return <ScreenLoader />;
  }

  const invite = pendingInvite.invite;

  return (
    <FrontDoorLayout
      dock={
        <>
          <GoogleAuthButton loading={google.isPending} onPress={() => void google.start()} />
          <EmailAuthButton disabled={google.isPending} onPress={onEmailPress} />
          <TermsLine />
          <SwitchLink
            action="Log in"
            lead="I have an account ·"
            onPress={onLoginPress}
            testID="onboarding-login"
          />
        </>
      }
      testID="create-account"
    >
      {invite ? (
        <InviteWelcome invite={invite} />
      ) : (
        <>
          <FrontDoorTitle
            subtitle="Small daily challenges for blood pressure, blood sugar, breathing and everyday health. Next, you pick yours."
            title="Welcome to Healthy"
          />
          <WelcomeDeck />
        </>
      )}
      {google.errorMessage ? (
        <InlineNotice icon="offline" message={google.errorMessage} tone="error" />
      ) : null}
    </FrontDoorLayout>
  );
}

/** One still card for the group, in place of the examples. */
function InviteWelcome({ invite }: { invite: PublicMatchInvitePreview }) {
  return (
    <>
      <FrontDoorTitle
        subtitle={inviteJoinLine(invite)}
        title={`${invite.hostDisplayName} invited you`}
      />
      <View style={styles.inviteCard} testID="invite-card">
        <DeckCard card={inviteDeckCard(invite, new Date())} />
      </View>
      <FieldNote centered>{invitePrivacyNote(invite)}</FieldNote>
    </>
  );
}

const styles = StyleSheet.create({
  inviteCard: {
    marginTop: spacing.lg,
  },
});
