import type { HealthCategory } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { healthCategories, type HealthCategoryOption } from '@/constants/health-categories';
import { type Theme, useTheme, useThemedStyles, withAlpha } from '@/theme';

const DISC_SIZE = 36;
const TICK_SIZE = 24;

/** One row per condition. A picked row takes on its condition's colour. */
export function ConditionPickList({
  picked,
  onToggle,
  hasLines = false,
}: {
  picked: readonly HealthCategory[];
  onToggle: (category: HealthCategory) => void;
  /** Adds what each condition covers under its name, as in Settings. */
  hasLines?: boolean;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.list}>
      {healthCategories.map((category) => (
        <ConditionPickRow
          category={category}
          hasLine={hasLines}
          isPicked={picked.includes(category.id)}
          key={category.id}
          onToggle={() => onToggle(category.id)}
        />
      ))}
    </View>
  );
}

function ConditionPickRow({
  category,
  hasLine,
  isPicked,
  onToggle,
}: {
  category: HealthCategoryOption;
  hasLine: boolean;
  isPicked: boolean;
  onToggle: () => void;
}) {
  const { colors, conditionTones } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tone = conditionTones[category.id];

  return (
    <Pressable
      accessibilityLabel={category.name}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isPicked }}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        isPicked
          ? { backgroundColor: withAlpha(tone, 0.12), borderColor: withAlpha(tone, 0.55) }
          : null,
        pressed && !isPicked ? styles.rowPressed : null,
      ]}
      testID={`category-${category.id}`}
    >
      <View style={[styles.disc, { backgroundColor: withAlpha(tone, 0.16) }]}>
        <Glyph color={tone} name={category.glyph} size={19} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name}>{category.name}</Text>
        {hasLine ? <Text style={styles.line}>{category.line}</Text> : null}
      </View>
      <View style={[styles.tick, isPicked ? { backgroundColor: tone, borderWidth: 0 } : null]}>
        {isPicked ? (
          <Glyph color={colors.onPrimary} name="check" size={14} strokeWidth={3} />
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: 6,
      marginTop: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: 'transparent',
      backgroundColor: theme.colors.surface,
    },
    rowPressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    disc: {
      width: DISC_SIZE,
      height: DISC_SIZE,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
    },
    name: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
    },
    line: {
      color: theme.colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    tick: {
      width: TICK_SIZE,
      height: TICK_SIZE,
      borderRadius: radii.full,
      borderWidth: 1.75,
      borderColor: theme.colors.tickIdle,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
