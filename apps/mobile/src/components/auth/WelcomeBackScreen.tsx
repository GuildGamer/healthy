import { InlineNotice } from '@/components/forms';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';
import { SwitchLink } from './FrontDoorText';
import { EmailAuthButton, GoogleAuthButton } from './SocialAuthButton';
import { useGoogleSignIn } from './use-google-sign-in';
import { useLastSignInMethod } from './use-last-sign-in-method';
import { WelcomeDeck } from './WelcomeDeck';

interface WelcomeBackScreenProps {
  onBackPress: () => void;
  onEmailPress: () => void;
  onNewHerePress: () => void;
  onSignedIn: () => Promise<void> | void;
}

/** The same ways in as sign-up, with the one this phone used last marked. */
export function WelcomeBackScreen({
  onBackPress,
  onEmailPress,
  onNewHerePress,
  onSignedIn,
}: WelcomeBackScreenProps) {
  const google = useGoogleSignIn(onSignedIn);
  const lastSignInMethod = useLastSignInMethod();

  return (
    <FrontDoorLayout
      dock={
        <>
          <GoogleAuthButton
            isLastUsed={lastSignInMethod === 'google'}
            loading={google.isPending}
            onPress={() => void google.start()}
            testID="login-google"
          />
          <EmailAuthButton
            disabled={google.isPending}
            isLastUsed={lastSignInMethod === 'email'}
            onPress={onEmailPress}
            testID="login-with-email"
          />
          <SwitchLink
            action="Make an account"
            lead="New here?"
            onPress={onNewHerePress}
            testID="login-sign-up"
          />
        </>
      }
      onBackPress={onBackPress}
      testID="welcome-back"
    >
      <FrontDoorTitle
        subtitle="Log in the way you signed up. Your streak, points and groups are kept with your account."
        title="Welcome back"
      />
      <WelcomeDeck />
      {google.errorMessage ? (
        <InlineNotice icon="offline" message={google.errorMessage} tone="error" />
      ) : null}
    </FrontDoorLayout>
  );
}
