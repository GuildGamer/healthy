import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';

type PasswordResetSuccessScreenProps = {
  onContinue: () => void;
};

export function PasswordResetSuccessScreen({
  onContinue,
}: PasswordResetSuccessScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badgeWrap}>
          <View style={styles.badgeOuter}>
            <View style={styles.badgeInner}>
              <Feather color={colors.onAccent} name="check" size={36} />
            </View>
          </View>
          <View style={styles.shield}>
            <Feather color={colors.accent} name="shield" size={16} />
          </View>
        </View>

        <Text style={styles.title}>Password Reset Complete!</Text>
        <Text style={styles.subtitle}>
          You can log in with your new password.
        </Text>

        <FormButton
          label="Continue to Login"
          onPress={onContinue}
          testID="reset-success-login"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  badgeWrap: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  badgeOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
