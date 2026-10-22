import type { MatchBoard } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import {
  SHARE_CARD_ASPECT_RATIO,
  SHARE_CARD_URL,
} from '@/components/challenges/ChallengeShareCard';
import { displayFontFamily } from '@/lib/fonts';
import { themeFor, type Theme } from '@/theme';
import { groupRecapContent } from './group-recap';
import { groupToneFor } from './group-tone';
import { RESULT_COPY } from './match-copy';

/** Drawn at this width and exported at 1080, so the type scale is fixed, not fitted. */
export const GROUP_RECAP_CARD_WIDTH = 360;
const INSET = 28;
const HERO_SIZE = 120;
const BAND_HEIGHT = 72;
const TONE_RULE_HEIGHT = 8;

/**
 * A finished group as a picture: your place as one hero numeral, your own
 * score and the length beside it. Square-edged so a JPEG export has no
 * white corners, and nobody else in the group appears on it.
 */
export function GroupRecapCard({ board }: { board: MatchBoard }) {
  const content = groupRecapContent(board);

  return (
    <View style={styles.shot} testID="match-recap-card">
      <View style={styles.field}>
        <View>
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>
              {`${RESULT_COPY.recapEyebrow} · ${content.kind}`.toUpperCase()}
            </Text>
            <Text style={styles.eyebrowText}>{content.length.toUpperCase()}</Text>
          </View>
          <View style={[styles.toneRule, { backgroundColor: groupToneFor(NIGHT, board).tone }]} />
          <Text style={styles.headline}>{content.headline}</Text>
        </View>
        <View>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.heroValue}>
            {content.hero.value}
          </Text>
          <Text style={styles.heroUnit}>{content.hero.unit}</Text>
        </View>
        <View>
          <View style={styles.rule} />
          <View style={styles.facts}>
            {content.facts.map((fact) => (
              <View key={fact.label} style={styles.fact}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.factValue}>{fact.value}</Text>
              </View>
            ))}
          </View>
          {content.claim ? <Text style={styles.claim}>{content.claim}</Text> : null}
        </View>
      </View>
      <View style={styles.band}>
        <Text style={styles.wordmark}>Healthy</Text>
        <Text style={styles.url}>{SHARE_CARD_URL}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    shot: {
      width: GROUP_RECAP_CARD_WIDTH,
      aspectRatio: SHARE_CARD_ASPECT_RATIO,
      backgroundColor: theme.colors.background,
    },
    field: {
      flex: 1,
      padding: INSET,
      justifyContent: 'space-between',
    },
    eyebrow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    eyebrowText: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
    },
    toneRule: {
      width: 48,
      height: TONE_RULE_HEIGHT,
      borderRadius: TONE_RULE_HEIGHT / 2,
      marginTop: spacing.md,
    },
    headline: {
      color: theme.colors.text,
      fontSize: 34,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1,
      marginTop: spacing.lg,
    },
    heroValue: {
      color: theme.colors.primary,
      fontFamily: displayFontFamily,
      fontSize: HERO_SIZE,
      lineHeight: HERO_SIZE * 1.04,
      letterSpacing: -3,
    },
    heroUnit: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: fontWeight.semibold,
    },
    rule: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginBottom: 14,
    },
    facts: {
      flexDirection: 'row',
    },
    fact: {
      flex: 1,
      gap: spacing.xs,
    },
    factLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
    },
    factValue: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: fontWeight.semibold,
    },
    claim: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      marginTop: 14,
    },
    band: {
      height: BAND_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: INSET,
      backgroundColor: theme.colors.primary,
    },
    wordmark: {
      color: theme.colors.onPrimary,
      fontFamily: displayFontFamily,
      fontSize: 22,
    },
    url: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
    },
  });

/** Exported pictures stay on Healthy night, whatever appearance is chosen. */
const NIGHT = themeFor('dark');
const styles = createStyles(NIGHT);
