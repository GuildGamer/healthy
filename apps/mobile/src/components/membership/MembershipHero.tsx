import { fontWeight } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const HERO_RADIUS = 26;
const RAIL_HEIGHT = 6;

interface MembershipHeroProps {
  eyebrow: string;
  title: string;
  perks: readonly string[];
}

/**
 * The plan as one card in the push-up colour: deep in dark mode, white with a
 * rail in light mode, like every deck card.
 */
export function MembershipHero({ eyebrow, title, perks }: MembershipHeroProps) {
  const { colors, deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card} testID="membership-hero">
      {deckCards.hasToneRail ? <View style={styles.rail} /> : null}
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <View style={styles.perks}>
        {perks.map((perk) => (
          <View key={perk} style={styles.perk}>
            <Glyph color={colors.accent} name="check" size={17} strokeWidth={2.6} />
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginTop: 14,
      overflow: 'hidden',
      borderRadius: HERO_RADIUS,
      padding: 20,
      backgroundColor: theme.deckCards.strength,
      shadowColor: theme.deckCards.shadow,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: theme.deckCards.hasToneRail ? 1 : 0,
      shadowRadius: 36,
    },
    rail: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: RAIL_HEIGHT,
      backgroundColor: theme.deckCards.tones.strength,
    },
    eyebrow: {
      color: theme.deckCards.hasToneRail ? theme.deckCards.tones.strength : theme.deckCards.subtext,
      fontSize: 13,
      fontWeight: fontWeight.medium,
    },
    title: {
      marginTop: 10,
      color: theme.deckCards.text,
      fontSize: 27,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.6,
      lineHeight: 30,
    },
    perks: {
      marginTop: 14,
    },
    perk: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 5,
    },
    perkText: {
      flex: 1,
      color: theme.deckCards.text,
      fontSize: 14.5,
      lineHeight: 20,
    },
  });
