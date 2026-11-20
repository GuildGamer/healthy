import { fontSize, fontWeight, spacing } from '@product/brand';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import type { HealthTip } from './constants/health-tips';

const COPY = {
  title: 'Why it matters',
} as const;

/** Benefit body + optional citation. Omit when there is no matching tip. */
export function WhyItMatters({
  tip,
  testID = 'why-it-matters',
}: {
  tip: HealthTip | null;
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);

  if (!tip) {
    return null;
  }

  return (
    <View style={styles.block} testID={testID}>
      <Text accessibilityRole="header" style={styles.title}>
        {COPY.title}
      </Text>
      <Text style={styles.body}>{tip.body}</Text>
      {tip.source ? (
        tip.sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(tip.sourceUrl!)}
            testID={`${testID}-source`}
          >
            <Text style={styles.sourceLink}>{tip.source}</Text>
          </Pressable>
        ) : (
          <Text style={styles.source}>{tip.source}</Text>
        )
      ) : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    block: {
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    title: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    body: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      lineHeight: Math.round(fontSize.md * 1.45),
    },
    source: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      marginTop: spacing.xs,
    },
    sourceLink: {
      color: theme.colors.accent,
      fontSize: fontSize.sm,
      marginTop: spacing.xs,
      textDecorationLine: 'underline',
    },
  });
}
