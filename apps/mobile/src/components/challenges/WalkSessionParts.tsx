import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DECK_SESSION_NUMERAL_SIZE, DeckButton } from '@/components/deck';
import { Glyph } from '@/components/icons';
import type { GeoPoint } from '@/lib/geo-session';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { WALK_COPY } from './constants/doing-copy';
import { WalkRouteMap } from './WalkRouteMap';

const MAP_STRIP_HEIGHT = 150;
const GOAL_TICK_SIZE = 34;

/** The walk's clock, big enough to read at arm's length, with a tick once the goal is met. */
export function WalkHero({
  value,
  of,
  isIdle,
  isGoalMet,
}: {
  value: string;
  of: string | null;
  isIdle: boolean;
  isGoalMet: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <Text style={[styles.heroValue, isIdle ? styles.heroIdle : null]} testID="session-stats">
          {value}
        </Text>
        {isGoalMet ? (
          <View style={styles.goalTick} testID="session-goal-tick">
            <Glyph color={colors.onPrimary} name="check" size={18} strokeWidth={3} />
          </View>
        ) : null}
      </View>
      {of ? <Text style={styles.of}>{of}</Text> : null}
    </View>
  );
}

export function WalkTrack({ ratio }: { ratio: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const percent = `${Math.round(Math.min(Math.max(ratio, 0), 1) * 100)}%` as const;

  return (
    <View style={styles.track}>
      <View
        style={[styles.trackFill, { width: percent, backgroundColor: colors.primary }]}
        testID="session-progress"
      />
    </View>
  );
}

/** A small strip of the route: proof it is really recording, never the main event. */
export function RouteStrip({ points, isRecording }: { points: GeoPoint[]; isRecording: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.mapStrip} testID="session-map">
      <WalkRouteMap isRecording={isRecording} points={points} />
    </View>
  );
}

export function WalkStat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} testID="session-secondary-stat">
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** A walk the phone already has from today, offered before recording a new one. */
export function FoundWalkCard({
  label,
  isBusy,
  onUse,
}: {
  label: string;
  isBusy: boolean;
  onUse: () => void;
}) {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.found} testID="found-sample">
      <Glyph color={deckCards.text} name="phone" size={22} />
      <View style={styles.foundText}>
        <Text style={styles.foundTitle}>{label}</Text>
        <Text style={styles.foundSub}>{WALK_COPY.foundOnPhone}</Text>
      </View>
      <DeckButton
        label={WALK_COPY.useThis}
        loading={isBusy}
        onPress={onUse}
        testID="use-sample"
        variant="tonal"
      />
    </View>
  );
}

export function LocationOffPanel() {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.panel} testID="session-location-off">
      <Glyph color={deckCards.text} name="pin" size={26} />
      <Text style={styles.panelTitle}>{WALK_COPY.locationOffTitle}</Text>
      <Text style={styles.panelBody}>{WALK_COPY.locationOffBody}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      marginTop: 22,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroValue: {
      color: theme.deckCards.text,
      fontSize: DECK_SESSION_NUMERAL_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -6,
      lineHeight: DECK_SESSION_NUMERAL_SIZE,
      fontVariant: ['tabular-nums'],
    },
    heroIdle: {
      opacity: 0.35,
    },
    goalTick: {
      width: GOAL_TICK_SIZE,
      height: GOAL_TICK_SIZE,
      borderRadius: GOAL_TICK_SIZE / 2,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    of: {
      color: theme.deckCards.subtext,
      fontSize: 17,
      fontWeight: fontWeight.medium,
      marginTop: spacing.sm,
    },
    track: {
      height: spacing.xs,
      borderRadius: 2,
      backgroundColor: theme.deckCards.track,
      overflow: 'hidden',
      marginTop: 18,
    },
    trackFill: {
      height: '100%',
      borderRadius: 2,
    },
    mapStrip: {
      height: MAP_STRIP_HEIGHT,
      borderRadius: radii.xl,
      overflow: 'hidden',
      marginTop: 18,
      backgroundColor: theme.colors.background,
    },
    stat: {
      marginTop: spacing.md,
    },
    statValue: {
      color: theme.deckCards.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
    },
    statLabel: {
      color: theme.deckCards.subtext,
      fontSize: 13,
      marginTop: 2,
    },
    found: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 20,
      padding: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: theme.deckCards.track,
    },
    foundText: {
      flex: 1,
    },
    foundTitle: {
      color: theme.deckCards.text,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
    },
    foundSub: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      marginTop: 2,
    },
    panel: {
      marginTop: 18,
      padding: 18,
      borderRadius: radii.xl,
      backgroundColor: theme.deckCards.track,
    },
    panelTitle: {
      color: theme.deckCards.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      marginTop: 10,
      marginBottom: spacing.xs,
    },
    panelBody: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      lineHeight: 21,
    },
  });
