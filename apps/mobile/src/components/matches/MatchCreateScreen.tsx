import type { MatchWindow } from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';
import { apiClient } from '@/lib/api';
import { MatchCard, MatchKicker, MatchMetricMark } from './match-chrome';
import {
  MATCH_CREATE_CTA,
  MATCH_CREATE_TITLE,
  MATCH_HOW_LONG,
  MATCH_KICKER,
  MATCH_RULE,
  MATCH_SCORING_LABEL,
  MATCH_TITLE,
  MATCH_WINDOW_TODAY,
  MATCH_WINDOW_TODAY_HINT,
  MATCH_WINDOW_WEEK,
  MATCH_WINDOW_WEEK_HINT,
} from './match-copy';
import { shareMatchLink } from './share-match-link';

const WINDOWS: { id: MatchWindow; label: string; hint: string }[] = [
  { id: 'today', label: MATCH_WINDOW_TODAY, hint: MATCH_WINDOW_TODAY_HINT },
  { id: 'week', label: MATCH_WINDOW_WEEK, hint: MATCH_WINDOW_WEEK_HINT },
];

export function MatchCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [window, setWindow] = useState<MatchWindow>('today');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => apiClient.createMatch({ window }),
    onSuccess: async (result) => {
      setError(null);
      await shareMatchLink(result.invite.url);
      router.replace(`/matches/${result.match.id}`);
    },
    onError: () => {
      setError('We could not start that match. Try again.');
    },
  });

  return (
    <View style={styles.screen} testID="match-create-screen">
      <View style={styles.body}>
        <MatchKicker>{MATCH_KICKER}</MatchKicker>
        <Text style={styles.title}>{MATCH_CREATE_TITLE}</Text>

        <MatchCard>
          <View style={styles.metricRow}>
            <MatchMetricMark />
            <View style={styles.metricText}>
              <Text style={styles.metricTitle}>{MATCH_TITLE}</Text>
              <Text style={styles.metricSub}>{MATCH_SCORING_LABEL}</Text>
            </View>
          </View>
          <Text style={styles.rule}>{MATCH_RULE}</Text>
        </MatchCard>

        <Text style={styles.section}>{MATCH_HOW_LONG}</Text>
        <View style={styles.windowRow}>
          {WINDOWS.map((option) => {
            const selected = option.id === window;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.id}
                onPress={() => setWindow(option.id)}
                style={[styles.tile, selected ? styles.tileSelected : null]}
                testID={`match-window-${option.id}`}
              >
                <Text
                  style={[
                    styles.tileLabel,
                    selected ? styles.tileLabelSelected : null,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.tileHint,
                    selected ? styles.tileHintSelected : null,
                  ]}
                >
                  {option.hint}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <FormErrorBanner message={error} /> : null}
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <FormButton
          label={MATCH_CREATE_CTA}
          loading={create.isPending}
          onPress={() => create.mutate()}
          testID="match-create-submit"
          trailingIcon="share"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xxl,
    lineHeight: 36,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricText: {
    flex: 1,
    gap: 2,
  },
  metricTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  metricSub: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  rule: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  section: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  windowRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  tileSelected: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.accent,
  },
  tileLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  tileLabelSelected: {
    color: colors.accent,
  },
  tileHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  tileHintSelected: {
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
