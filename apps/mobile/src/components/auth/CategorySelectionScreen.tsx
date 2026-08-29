import Feather from '@expo/vector-icons/Feather';
import type { HealthCategory } from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner, OptionCard } from '@/components/forms';
import { healthCategories } from '@/constants/health-categories';

interface CategorySelectionScreenProps {
  onContinue: (selectedCategoryIds: readonly HealthCategory[]) => Promise<void> | void;
}

const SAVE_FAILED_MESSAGE =
  'We could not save your selections. Check your connection and try again.';

export function CategorySelectionScreen({ onContinue }: CategorySelectionScreenProps) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<readonly HealthCategory[]>(
    [],
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleCategory(categoryId: HealthCategory) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  async function handleContinue() {
    if (selectedCategoryIds.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onContinue(selectedCategoryIds);
    } catch {
      setErrorMessage(SAVE_FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>What are you managing?</Text>
        <Text style={styles.subtitle}>
          Select the health conditions you want to manage with Healthy. This helps us show you
          relevant challenges.
        </Text>

        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

        <View style={styles.options}>
          {healthCategories.map((category) => (
            <OptionCard
              icon={
                <View style={styles.iconTile}>
                  <Feather color={colors.accent} name={category.icon} size={24} />
                </View>
              }
              key={category.id}
              onPress={() => toggleCategory(category.id)}
              selected={selectedCategoryIds.includes(category.id)}
              testID={`category-${category.id}`}
              title={category.name}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <FormButton
          disabled={selectedCategoryIds.length === 0}
          label="Continue"
          loading={isSubmitting}
          onPress={handleContinue}
          testID="category-continue"
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  options: {
    gap: spacing.sm,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: spacing.lg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
});
