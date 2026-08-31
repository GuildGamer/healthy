import { colors } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';

export type FieldMarkRole = 'email' | 'password' | 'name';

/**
 * Auth-field marks without icon fonts or tinted badges — those read as
 * template SaaS. Typographic / geometric signals instead.
 */
export function FieldMark({ role }: { role: FieldMarkRole }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={styles.glyph}
    >
      {glyphFor(role)}
    </View>
  );
}

function glyphFor(role: FieldMarkRole) {
  if (role === 'email') {
    return <Text style={styles.at}>@</Text>;
  }

  if (role === 'password') {
    return (
      <View style={styles.keyhole}>
        <View style={styles.keyholeRing} />
        <View style={styles.keyholeSlot} />
      </View>
    );
  }

  return <Text style={styles.initials}>Aa</Text>;
}

const GLYPH = 18;

const styles = StyleSheet.create({
  glyph: {
    width: GLYPH,
    height: GLYPH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  at: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 18,
    includeFontPadding: false,
  },
  keyhole: {
    width: GLYPH,
    height: GLYPH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyholeRing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  keyholeSlot: {
    width: 3.5,
    height: 6,
    marginTop: -1.5,
    borderBottomLeftRadius: 1.5,
    borderBottomRightRadius: 1.5,
    backgroundColor: colors.accent,
  },
  initials: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 18,
    includeFontPadding: false,
  },
});
