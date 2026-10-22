import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fontWeight } from '@product/brand';
import { useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import heroBanner from '@/assets/hero-banner.png';
import { displayFontFamily, tipQuoteFontFamily } from '@/lib/fonts';
import { formatClockTime } from '@/lib/clock-time';

/**
 * Share card art direction: an editorial result slip on a mint billboard.
 *
 * - A calm navy field with rounded bottom corners sits on a mint band that
 *   carries the wordmark and URL. The band is what strangers remember.
 * - One serif headline, one massive mint Archivo numeral, then a hairline and
 *   a small label/value grid. Nothing else competes.
 * - Home's leaf owns the field's bottom-right corner, behind the grid.
 * - "Counted by camera" is claimed only when the camera actually counted reps.
 *
 * Everything is laid out in a 360-wide design space and scaled to the
 * measured card width, so the 1080×1440 export has the same composition on
 * every phone instead of whatever the preview happened to fit.
 */

export type ChallengeShareCardProps = {
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
  photoUri?: string;
  photoWidth?: number;
  photoHeight?: number;
  capturedAt?: Date;
  completedCount?: number;
  targetCount?: number;
  kicker?: string;
  /** True only when the camera counted the reps on this card. */
  verified?: boolean;
};

export function formatShareReps(completedCount: number, targetCount?: number): string {
  if (targetCount != null && targetCount > 0) {
    return `${completedCount}/${targetCount}`;
  }

  return String(completedCount);
}

/** Feed-friendly portrait. Stories crop; compose for the center band. */
export const SHARE_CARD_ASPECT_RATIO = 3 / 4;

/** Export pixels — capture at this size so the share is sharp, not a screen preview. */
export const SHARE_CARD_EXPORT_WIDTH = 1080;
export const SHARE_CARD_EXPORT_HEIGHT = Math.round(
  SHARE_CARD_EXPORT_WIDTH / SHARE_CARD_ASPECT_RATIO,
);

export const SHARE_CARD_URL = 'gethealthyapp.com';

/** Width the type scale below is drawn for; the card scales from here. */
const DESIGN_WIDTH = 360;
const HERO_BANNER_ASPECT_RATIO = 512 / 341;
/** Sampled from `hero-banner.png` — the leaf's own canvas, so the field has no seam. */
const HERO_BANNER_NAVY = '#070E1E';
/** Leaf sized to own the corner like an object, not wash the whole field. */
const LEAF_WIDTH_RATIO = 1.1;
const PHOTO_FADE_STOPS = 28;

const designSize = {
  inset: 28,
  fieldRadius: 28,
  band: 72,
  wordmark: 22,
  url: 13,
  headline: 28,
  headlineLineHeight: 34,
  context: 14,
  contextLineHeight: 20,
  heroNumeral: 120,
  heroUnit: 17,
  metaRule: 236,
  metaCell: 118,
  metaLabel: 12,
  metaValue: 17,
  metaIcon: 16,
  kicker: 12,
  foot: 13,
  footIcon: 14,
  flame: 18,
  flameCore: 11,
  photoNumeral: 64,
} as const;

export function streakShareLabel(days: number): string {
  if (days <= 0) {
    return 'Fresh start';
  }

  if (days === 1) {
    return '1 day streak';
  }

  return `${days} day streak`;
}

/** Value under the grid's "Streak" label — the label already says streak. */
export function formatShareStreakValue(days: number): string {
  if (days <= 0) {
    return 'Fresh start';
  }

  if (days === 1) {
    return '1 day';
  }

  return `${days} days`;
}

/** Kicker as an editorial sentence: "Challenge complete." */
export function formatShareHeadline(kicker: string): string {
  if (/[.!?]$/.test(kicker)) {
    return kicker;
  }

  return `${kicker}.`;
}

export function formatShareDate(at: Date = new Date()): string {
  return at.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatShareStamp(at: Date = new Date()): string {
  return `${formatShareDate(at)} · ${formatClockTime(at)}`;
}

/** Subline under the headline: the challenge, unless the hero already says it, then the day. */
export function formatShareContext(title: string, unit: string, at: Date = new Date()): string {
  const titleRepeatsUnit = title.toLowerCase().includes(unit);
  if (title.length === 0 || titleRepeatsUnit) {
    return formatShareDate(at);
  }

  return `${title} · ${formatShareDate(at)}`;
}

function useCardScale() {
  const [cardWidth, setCardWidth] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setCardWidth(event.nativeEvent.layout.width);
  }

  const scale = cardWidth > 0 ? cardWidth / DESIGN_WIDTH : 1;
  return { cardWidth, scale, handleLayout };
}

export function ChallengeShareCard({
  title,
  pointsAwarded,
  currentStreakDays,
  photoUri,
  capturedAt,
  completedCount,
  targetCount,
  kicker = 'Challenge complete',
  verified = false,
}: ChallengeShareCardProps) {
  const { cardWidth, scale, handleLayout } = useCardScale();
  const fieldRadius = designSize.fieldRadius * scale;

  return (
    <View onLayout={handleLayout} style={styles.shot} testID="challenge-share-card">
      <View
        style={[
          styles.field,
          {
            borderBottomLeftRadius: fieldRadius,
            borderBottomRightRadius: fieldRadius,
          },
        ]}
      >
        {photoUri ? (
          <PhotoField
            capturedAt={capturedAt}
            completedCount={completedCount}
            currentStreakDays={currentStreakDays}
            kicker={kicker}
            photoUri={photoUri}
            scale={scale}
            verified={verified}
          />
        ) : (
          <PosterField
            capturedAt={capturedAt}
            cardWidth={cardWidth}
            completedCount={completedCount}
            currentStreakDays={currentStreakDays}
            kicker={kicker}
            pointsAwarded={pointsAwarded}
            scale={scale}
            targetCount={targetCount}
            title={title}
            verified={verified}
          />
        )}
      </View>
      <BillboardBand scale={scale} />
    </View>
  );
}

/** The mint band: wordmark left, URL right. Drawn on the shot itself so corners stay mint. */
function BillboardBand({ scale }: { scale: number }) {
  return (
    <View
      style={[
        styles.band,
        {
          height: designSize.band * scale,
          paddingHorizontal: designSize.inset * scale,
        },
      ]}
    >
      <Text style={[styles.bandWordmark, { fontSize: designSize.wordmark * scale }]}>Healthy</Text>
      <Text
        style={[styles.bandUrl, { fontSize: designSize.url * scale, letterSpacing: 0.2 * scale }]}
      >
        {SHARE_CARD_URL}
      </Text>
    </View>
  );
}

function PosterField({
  title,
  pointsAwarded,
  currentStreakDays,
  completedCount,
  targetCount,
  capturedAt,
  cardWidth,
  scale,
  kicker,
  verified,
}: {
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
  completedCount?: number;
  targetCount?: number;
  capturedAt?: Date;
  cardWidth: number;
  scale: number;
  kicker: string;
  verified: boolean;
}) {
  const hasReps = completedCount != null && completedCount > 0;
  const hero = hasReps ? String(completedCount) : `+${pointsAwarded}`;
  const unit = hasReps ? 'push-ups' : 'points';
  const goal = hasReps && targetCount != null && targetCount > 0 ? targetCount : undefined;

  return (
    <>
      <LeafMark cardWidth={cardWidth} />

      <View style={[styles.poster, { padding: designSize.inset * scale }]}>
        <View>
          <PosterHeadline
            context={formatShareContext(title, unit, capturedAt)}
            headline={formatShareHeadline(kicker)}
            scale={scale}
          />
          <PosterHero hero={hero} scale={scale} unit={unit} />
        </View>

        <ShareMetaGrid
          currentStreakDays={currentStreakDays}
          goal={goal}
          scale={scale}
          verified={verified}
        />
      </View>
    </>
  );
}

function PosterHeadline({
  headline,
  context,
  scale,
}: {
  headline: string;
  context: string;
  scale: number;
}) {
  return (
    <>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[
          styles.headline,
          {
            fontSize: designSize.headline * scale,
            lineHeight: designSize.headlineLineHeight * scale,
          },
        ]}
      >
        {headline}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.context,
          {
            fontSize: designSize.context * scale,
            lineHeight: designSize.contextLineHeight * scale,
            marginTop: 6 * scale,
          },
        ]}
      >
        {context}
      </Text>
    </>
  );
}

function PosterHero({ hero, unit, scale }: { hero: string; unit: string; scale: number }) {
  return (
    <View style={{ marginTop: 22 * scale }}>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[
          styles.heroNumeral,
          {
            fontSize: designSize.heroNumeral * scale,
            lineHeight: designSize.heroNumeral * 1.04 * scale,
            letterSpacing: -3 * scale,
          },
        ]}
      >
        {hero}
      </Text>
      <Text
        style={[styles.heroUnit, { fontSize: designSize.heroUnit * scale, marginTop: 2 * scale }]}
      >
        {unit}
      </Text>
    </View>
  );
}

/** Hairline, then label/value pairs; the camera claim takes the accent slot. */
function ShareMetaGrid({
  goal,
  currentStreakDays,
  verified,
  scale,
}: {
  goal?: number;
  currentStreakDays: number;
  verified: boolean;
  scale: number;
}) {
  return (
    <View>
      <View
        style={[
          styles.metaRule,
          {
            width: designSize.metaRule * scale,
            height: scale,
            marginBottom: 14 * scale,
          },
        ]}
      />
      <View style={styles.metaRow}>
        {goal != null ? <MetaCell label="Goal" scale={scale} value={String(goal)} /> : null}
        <MetaCell label="Streak" scale={scale} value={formatShareStreakValue(currentStreakDays)} />
      </View>
      {verified ? (
        <View style={{ marginTop: 14 * scale }}>
          <VerifiedClaim scale={scale} />
        </View>
      ) : null}
    </View>
  );
}

function MetaCell({ label, value, scale }: { label: string; value: string; scale: number }) {
  return (
    <View style={{ width: designSize.metaCell * scale, gap: 4 * scale }}>
      <Text style={[styles.metaLabel, { fontSize: designSize.metaLabel * scale }]}>{label}</Text>
      <Text style={[styles.metaValue, { fontSize: designSize.metaValue * scale }]}>{value}</Text>
    </View>
  );
}

function PhotoField({
  currentStreakDays,
  photoUri,
  scale,
  kicker,
  verified,
  completedCount,
  capturedAt = new Date(),
}: {
  currentStreakDays: number;
  photoUri: string;
  scale: number;
  kicker: string;
  verified: boolean;
  completedCount?: number;
  capturedAt?: Date;
}) {
  const stamp = formatShareStamp(capturedAt);
  const inset = designSize.inset * scale;

  return (
    <>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={{ uri: photoUri }}
        style={styles.fill}
      />
      <PhotoFade />

      <View
        style={[styles.photoStats, { left: inset, right: inset, bottom: inset, gap: 4 * scale }]}
      >
        {completedCount != null && completedCount > 0 ? (
          <PhotoRepsHero
            completedCount={completedCount}
            currentStreakDays={currentStreakDays}
            kicker={kicker}
            scale={scale}
            stamp={stamp}
          />
        ) : (
          <PhotoStreakHero currentStreakDays={currentStreakDays} scale={scale} stamp={stamp} />
        )}
        {verified ? <VerifiedClaim overPhoto scale={scale} /> : null}
      </View>
    </>
  );
}

function PhotoRepsHero({
  completedCount,
  currentStreakDays,
  kicker,
  scale,
  stamp,
}: {
  completedCount: number;
  currentStreakDays: number;
  kicker: string;
  scale: number;
  stamp: string;
}) {
  return (
    <>
      <Text
        style={[
          styles.overlayText,
          styles.kicker,
          { fontSize: designSize.kicker * scale, letterSpacing: 1.6 * scale },
        ]}
      >
        {kicker}
      </Text>
      <View style={[styles.baselineRow, { gap: 8 * scale }]}>
        <Text
          style={[
            styles.overlayText,
            styles.heroNumeral,
            {
              fontSize: designSize.photoNumeral * scale,
              lineHeight: designSize.photoNumeral * 1.08 * scale,
            },
          ]}
        >
          {completedCount}
        </Text>
        <Text
          style={[
            styles.overlayText,
            styles.photoUnitText,
            { fontSize: designSize.heroUnit * scale },
          ]}
        >
          push-ups
        </Text>
      </View>
      <Text
        style={[
          styles.overlayText,
          styles.photoMetaText,
          { fontSize: designSize.foot * scale, marginBottom: 6 * scale },
        ]}
      >
        {streakShareLabel(currentStreakDays)} · {stamp}
      </Text>
    </>
  );
}

function PhotoStreakHero({
  currentStreakDays,
  scale,
  stamp,
}: {
  currentStreakDays: number;
  scale: number;
  stamp: string;
}) {
  const hasStreak = currentStreakDays > 0;

  return (
    <>
      {hasStreak ? (
        <View style={[styles.baselineRow, { gap: 6 * scale }]}>
          <StreakFlame scale={scale * 1.4} />
          <Text
            style={[
              styles.overlayText,
              styles.heroNumeral,
              {
                fontSize: designSize.photoNumeral * scale,
                lineHeight: designSize.photoNumeral * 1.08 * scale,
              },
            ]}
          >
            {currentStreakDays}
          </Text>
        </View>
      ) : null}
      <Text
        style={[
          styles.overlayText,
          styles.photoUnitText,
          { fontSize: designSize.heroUnit * scale },
        ]}
      >
        {hasStreak ? 'day streak' : 'Fresh start'}
      </Text>
      <Text
        style={[
          styles.overlayText,
          styles.photoMetaText,
          { fontSize: designSize.foot * scale, marginBottom: 6 * scale },
        ]}
      >
        {stamp}
      </Text>
    </>
  );
}

/**
 * Home's leaf, whole, pinned to the field's bottom-right so the field's
 * rounded corner crops it like an object set into the card.
 */
function LeafMark({ cardWidth }: { cardWidth: number }) {
  if (cardWidth <= 0) {
    return null;
  }

  const leafWidth = cardWidth * LEAF_WIDTH_RATIO;

  return (
    <Image
      accessibilityElementsHidden
      accessibilityIgnoresInvertColors
      importantForAccessibility="no"
      resizeMode="cover"
      source={heroBanner}
      style={[styles.leaf, { width: leafWidth, height: leafWidth / HERO_BANNER_ASPECT_RATIO }]}
    />
  );
}

function VerifiedClaim({ scale, overPhoto = false }: { scale: number; overPhoto?: boolean }) {
  const textSize = overPhoto ? designSize.foot : designSize.metaValue;
  const iconSize = overPhoto ? designSize.footIcon : designSize.metaIcon;

  return (
    <View style={[styles.centerRow, { gap: 6 * scale }]}>
      <Feather color={colors.accent} name="camera" size={iconSize * scale} />
      <Text
        style={[
          overPhoto ? styles.overlayText : null,
          styles.verifiedText,
          { fontSize: textSize * scale },
        ]}
      >
        Counted by camera
      </Text>
    </View>
  );
}

function StreakFlame({ scale }: { scale: number }) {
  const flameSize = designSize.flame * scale;
  const coreSize = designSize.flameCore * scale;

  return (
    <View style={{ width: flameSize, height: flameSize }}>
      <MaterialCommunityIcons color={colors.streak} name="fire" size={flameSize} />
      <MaterialCommunityIcons
        color={colors.streakCore}
        name="fire"
        size={coreSize}
        style={[styles.flameCore, { left: (flameSize - coreSize) / 2, bottom: 2 * scale }]}
      />
    </View>
  );
}

function PhotoFade() {
  return (
    <View pointerEvents="none" style={styles.photoFade}>
      {Array.from({ length: PHOTO_FADE_STOPS }, (_, index) => {
        const progress = index / (PHOTO_FADE_STOPS - 1);
        return (
          <View
            key={index}
            style={[styles.photoFadeStop, { opacity: progress * progress * 0.85 }]}
          />
        );
      })}
    </View>
  );
}

const overlayShadow = {
  textShadowColor: 'rgba(11, 18, 32, 0.75)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 10,
} as const;

const styles = StyleSheet.create({
  /** Square and mint: the field's rounded corners reveal the band colour, never white. */
  shot: {
    width: '100%',
    aspectRatio: SHARE_CARD_ASPECT_RATIO,
    overflow: 'hidden',
    backgroundColor: colors.accent,
  },
  field: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: HERO_BANNER_NAVY,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  leaf: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  poster: {
    flex: 1,
    justifyContent: 'space-between',
  },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bandWordmark: {
    color: colors.onAccent,
    fontFamily: displayFontFamily,
  },
  bandUrl: {
    color: colors.onAccent,
    fontWeight: fontWeight.semibold,
  },
  headline: {
    color: colors.text,
    fontFamily: tipQuoteFontFamily,
  },
  context: {
    color: colors.muted,
  },
  heroNumeral: {
    color: colors.accent,
    fontFamily: displayFontFamily,
  },
  heroUnit: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  /** Scaled, not hairline: a 1px export rule disappears once Instagram recompresses it. */
  metaRule: {
    backgroundColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
  },
  metaLabel: {
    color: colors.muted,
  },
  metaValue: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  kicker: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /** Over a photo `muted` loses to the image; stay at `text`, carried by the fade. */
  photoUnitText: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  photoMetaText: {
    color: colors.text,
    opacity: 0.85,
  },
  verifiedText: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  flameCore: {
    position: 'absolute',
  },
  photoFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
    justifyContent: 'flex-end',
  },
  photoFadeStop: {
    flex: 1,
    backgroundColor: colors.background,
  },
  photoStats: {
    position: 'absolute',
  },
  overlayText: {
    ...overlayShadow,
  },
});
