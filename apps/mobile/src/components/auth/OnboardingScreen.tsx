import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';
import {
  ONBOARDING_AUTO_MS,
  onboardingSlides,
  type OnboardingSlide,
} from './constants/onboarding-slides';
import { OnboardingSlideArt } from './OnboardingSlideArt';

interface OnboardingScreenProps {
  onGetStarted: () => void;
  onLoginPress: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function OnboardingScreen({ onGetStarted, onLoginPress }: OnboardingScreenProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const indexRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isDraggingRef.current) {
        return;
      }

      const next = (indexRef.current + 1) % onboardingSlides.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      indexRef.current = next;
      setSlideIndex(next);
    }, ONBOARDING_AUTO_MS);

    return () => clearInterval(timer);
  }, []);

  function onViewableItemsChanged({
    viewableItems,
  }: {
    viewableItems: ViewToken[];
  }) {
    const first = viewableItems[0];
    if (first?.index == null) {
      return;
    }

    indexRef.current = first.index;
    setSlideIndex(first.index);
  }

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const onViewableItemsChangedRef = useRef(onViewableItemsChanged);
  onViewableItemsChangedRef.current = onViewableItemsChanged;

  function handleScrollBegin() {
    isDraggingRef.current = true;
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    isDraggingRef.current = false;
    const offset = event.nativeEvent.contentOffset.x;
    const next = Math.round(offset / SCREEN_WIDTH);
    const clamped = Math.max(0, Math.min(next, onboardingSlides.length - 1));
    indexRef.current = clamped;
    setSlideIndex(clamped);
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={onboardingSlides}
        horizontal
        pagingEnabled
        bounces={false}
        style={styles.carousel}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({
            offset: index * SCREEN_WIDTH,
            animated: true,
          });
        }}
        onViewableItemsChanged={(info) => onViewableItemsChangedRef.current(info)}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={styles.slide} testID={`onboarding-slide-${item.id}`}>
            <OnboardingSlideArt art={item.art} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityRole="tablist">
          {onboardingSlides.map((item, index) => (
            <View
              key={item.id}
              accessibilityLabel={`Slide ${index + 1}`}
              style={[
                styles.dot,
                index === slideIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <FormButton
          label="Get Started"
          onPress={onGetStarted}
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
  carousel: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  description: {
    color: colors.muted,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
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
    fontWeight: fontWeight.medium,
  },
});
