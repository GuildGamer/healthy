import { StyleSheet, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { useTheme, withAlpha } from '@/theme';
import type { GroupRules } from './group-rule-copy';
import { groupToneFor } from './group-tone';

const DISC_SIZE = 38;
const CLINIC_WHITE_WASH = 0.13;

/** A group's mark at the start of a row: its glyph in a soft circle of its colour. */
export function GroupToneDisc({ rules }: { rules: GroupRules }) {
  const theme = useTheme();
  const tone = groupToneFor(theme, rules);
  const fill = theme.deckCards.hasToneRail ? withAlpha(tone.tone, CLINIC_WHITE_WASH) : tone.fill;

  return <ToneDisc fill={fill} glyph={tone.glyph} glyphColor={tone.tone} />;
}

/** The same circle for a row that is not one group, such as Past groups. */
export function PlainDisc({ glyph }: { glyph: GlyphName }) {
  const theme = useTheme();
  return (
    <ToneDisc fill={theme.colors.surfaceRaised} glyph={glyph} glyphColor={theme.colors.muted} />
  );
}

function ToneDisc({
  fill,
  glyph,
  glyphColor,
}: {
  fill: string;
  glyph: GlyphName;
  glyphColor: string;
}) {
  return (
    <View style={[styles.disc, { backgroundColor: fill }]}>
      <Glyph color={glyphColor} name={glyph} size={18} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
