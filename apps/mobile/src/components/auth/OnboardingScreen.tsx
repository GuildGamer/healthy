import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton } from '@/components/forms';
import { onboardingSlides } from './constants/onboarding-slides';

interface OnboardingScreenProps {
  onGetStarted: () => void;
  onLoginPress: () => void;
}

export function OnboardingScreen({ onGetStarted, onLoginPress }: OnboardingScreenProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  const slide = onboardingSlides[slideIndex];
  const isLastSlide = slideIndex === onboardingSlides.length - 1;

  function handleAdvance() {
    if (isLastSlide) {
      onGetStarted();
      return;
    }

    setSlideIndex(slideIndex + 1);
  }

  if (!slide) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.slide}>
        <Feather color={colors.accent} name={slide.icon} size={88} />

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {onboardingSlides.map((item, index) => (
            <View
              key={item.title}
              style={[styles.dot, index === slideIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <FormButton
          label={isLastSlide ? 'Get Started' : 'Next'}
          onPress={handleAdvance}
          testID="onboarding-advance"
          trailingIcon="chevron-right"
        />

        <Pressable
          accessibilityRole="button"
          onPress={onLoginPress}
          style={styles.loginLink}
          testID="onboarding-login"
        >
          <Text style={styles.loginLinkText}>Already have an account? Log In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  description: {
    color: colors.muted,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dot: {
    height: 8,
    borderRadius: radii.full,
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loginLinkText: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
});
