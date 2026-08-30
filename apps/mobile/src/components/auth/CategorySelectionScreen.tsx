import Feather from '@expo/vector-icons/Feather';
import type { HealthCategory } from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChallengeIcon } from '@/components/challenges/ChallengeIcon';
import { FormButton, FormErrorBanner } from '@/components/forms';
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

  const selectedCount = selectedCategoryIds.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Build your Healthy</Text>
        <Text style={styles.subtitle}>
          We&apos;ll tune challenges to what you pick.
        </Text>

        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

        <View style={styles.card}>
          {healthCategories.map((category, index) => {
            const isSelected = selectedCategoryIds.includes(category.id);

            return (
              <View key={category.id}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => toggleCategory(category.id)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed ? styles.rowPressed : null,
                  ]}
                  testID={`category-${category.id}`}
                >
                  <ChallengeIcon
                    category={category.id}
                    name={category.mark}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{category.name}</Text>
                    <Text style={styles.rowLine}>{category.line}</Text>
                  </View>
                  <View
                    style={[
                      styles.check,
                      isSelected ? styles.checkSelected : styles.checkIdle,
                    ]}
                  >
                    {isSelected ? (
                      <Feather color={colors.onAccent} name="check" size={14} />
                    ) : null}
                  </View>
                </Pressable>
                {index < healthCategories.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <FormButton
          disabled={selectedCount === 0}
          label={
            selectedCount === 0
              ? 'Continue'
              : `Continue · ${selectedCount} selected`
          }
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  rowLine: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.accent,
  },
  checkIdle: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
});
