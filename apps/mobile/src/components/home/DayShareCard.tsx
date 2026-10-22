import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import {
  SHARE_CARD_ASPECT_RATIO,
  SHARE_CARD_URL,
} from '@/components/challenges/ChallengeShareCard';
import { displayFontFamily } from '@/lib/fonts';
import { themeFor, type Theme } from '@/theme';
import { TODAY_COPY } from './constants/today-copy';
import { dayShareFacts, dayShareHero } from './day-share';
import type { DayShareContent } from './types/day-share';

/** Drawn at this width and exported at 1080, so the type scale is fixed, not fitted. */
export const DAY_SHARE_CARD_WIDTH = 360;
const INSET = 28;
const SEGMENT_HEIGHT = 8;
const HERO_SIZE = 120;
const BAND_HEIGHT = 72;

/**
 * The day as a picture: the run as one hero numeral, the tally that earned it,
 * and nothing that names a condition. Square-edged so a JPEG export has no
 * white corners.
 */
export function DayShareCard({ content }: { content: DayShareContent }) {
  const hero = dayShareHero(content);

  return (
    <View style={styles.shot} testID="home-day-share-card">
      <View style={styles.field}>
        <View>
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>
              {`${content.weekday} · ${content.dateLabel}`.toUpperCase()}
            </Text>
            <Text style={styles.eyebrowText}>
              {content.completedCount} of {content.totalCount}
            </Text>
          </View>
          <DayTally completedCount={content.completedCount} totalCount={content.totalCount} />
          <Text style={styles.headline}>{TODAY_COPY.dayDoneTitle}</Text>
        </View>
        <View>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.heroValue}>
            {hero.value}
          </Text>
          <Text style={styles.heroUnit}>{hero.unit}</Text>
        </View>
        <ShareFacts content={content} />
      </View>
      <View style={styles.band}>
        <Text style={styles.wordmark}>Healthy</Text>
        <Text style={styles.url}>{SHARE_CARD_URL}</Text>
      </View>
    </View>
  );
}

function DayTally({ completedCount, totalCount }: { completedCount: number; totalCount: number }) {
  return (
    <View style={styles.tally}>
      {Array.from({ length: totalCount }, (_, index) => (
        <View
          key={index}
          style={[styles.segment, index < completedCount ? styles.segmentDone : null]}
        />
      ))}
    </View>
  );
}

function ShareFacts({ content }: { content: DayShareContent }) {
  return (
    <View>
      <View style={styles.rule} />
      <View style={styles.facts}>
        {dayShareFacts(content).map((fact) => (
          <View key={fact.label} style={styles.fact}>
            <Text style={styles.factLabel}>{fact.label}</Text>
            <Text style={styles.factValue}>{fact.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    shot: {
      width: DAY_SHARE_CARD_WIDTH,
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
    },
    eyebrowText: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
    },
    tally: {
      flexDirection: 'row',
      gap: 6,
      marginTop: spacing.md,
    },
    segment: {
      flex: 1,
      height: SEGMENT_HEIGHT,
      borderRadius: SEGMENT_HEIGHT / 2,
      backgroundColor: theme.colors.surfaceRaised,
    },
    segmentDone: {
      backgroundColor: theme.colors.primary,
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
