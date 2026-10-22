import type { HealthCategory } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { FormButton, InlineNotice } from '@/components/forms';
import { type Theme, useThemedStyles } from '@/theme';
import { ConditionPickList } from '@/components/health/ConditionPickList';
import { FirstDayPreview } from './FirstDayPreview';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';

const SAVE_FAILED_MESSAGE = 'Couldn’t save your picks. Check your connection and try again.';

interface ConditionPickerScreenProps {
  initialPicked?: readonly HealthCategory[];
  submitLabel: string;
  onSubmit: (picked: readonly HealthCategory[]) => Promise<void> | void;
}

/**
 * The first screen: what you are looking after, with the first day it builds
 * right underneath, so the choice shows its consequence as it is made.
 */
export function ConditionPickerScreen({
  initialPicked = [],
  submitLabel,
  onSubmit,
}: ConditionPickerScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [picked, setPicked] = useState<readonly HealthCategory[]>(initialPicked);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  function toggle(category: HealthCategory) {
    setPicked((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  async function submit() {
    if (picked.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setHasFailed(false);
    try {
      await onSubmit(picked);
    } catch {
      setHasFailed(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FrontDoorLayout
      dock={
        <FormButton
          disabled={picked.length === 0}
          label={submitLabel}
          loading={isSubmitting}
          onPress={() => void submit()}
          testID="category-continue"
        />
      }
      testID="condition-picker"
    >
      <FrontDoorTitle title="What are you looking after?" />
      {hasFailed ? (
        <InlineNotice icon="offline" message={SAVE_FAILED_MESSAGE} tone="error" />
      ) : null}
      <ConditionPickList onToggle={toggle} picked={picked} />
      <Text style={styles.sectionLabel}>Your first day</Text>
      <FirstDayPreview picked={picked} />
    </FrontDoorLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
  });
