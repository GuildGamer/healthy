import { type ColorScheme, fontSize, fontWeight, palettes } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SettingsNote } from '@/components/settings';
import { goBackOrHome } from '@/lib/go-back';
import {
  type AppearancePreference,
  appearanceLabel,
  type Theme,
  useAppearancePreference,
  useThemedStyles,
} from '@/theme';
import { APPEARANCE_AUTO_NOTE } from './constants/settings-copy';
import { SettingsPage } from './SettingsPage';

/** The board's order: night, day, then the phone. */
const APPEARANCE_OPTIONS: readonly AppearancePreference[] = ['dark', 'light', 'auto'];

/** Three pictures of the app. Tapping one switches it immediately. */
export function AppearanceScreen() {
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference } = useAppearancePreference();

  return (
    <SettingsPage
      onBack={() => goBackOrHome('/settings')}
      testID="appearance-settings"
      title="Appearance"
    >
      <View accessibilityRole="radiogroup" style={styles.options}>
        {APPEARANCE_OPTIONS.map((option) => (
          <AppearanceOption
            key={option}
            onSelect={setPreference}
            preference={option}
            selected={preference === option}
          />
        ))}
      </View>
      <SettingsNote centered>{APPEARANCE_AUTO_NOTE}</SettingsNote>
    </SettingsPage>
  );
}

function AppearanceOption({
  onSelect,
  preference,
  selected,
}: {
  onSelect: (preference: AppearancePreference) => void;
  preference: AppearancePreference;
  selected: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const label = appearanceLabel(preference);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => onSelect(preference)}
      style={styles.option}
      testID={`appearance-${preference}`}
    >
      <View style={[styles.mini, selected ? styles.miniOn : null]}>
        {preference === 'auto' ? <AutoSketch /> : <SchemeSketch scheme={preference} />}
      </View>
      <View style={[styles.radio, selected ? styles.radioOn : null]} />
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

function AutoSketch() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.auto}>
      <SchemeSketch scheme="light" />
      <SchemeSketch scheme="dark" />
    </View>
  );
}

/** A tiny page in one palette, so the choice is visible before the tap. */
function SchemeSketch({ scheme }: { scheme: ColorScheme }) {
  const styles = useThemedStyles(createStyles);
  const palette = palettes[scheme];

  return (
    <View style={[styles.sketch, { backgroundColor: palette.background }]}>
      <View style={[styles.bar, { backgroundColor: palette.text }]} />
      <View
        style={[
          styles.block,
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      />
      <View
        style={[
          styles.block,
          styles.row,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      />
      <View
        style={[
          styles.block,
          styles.row,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      />
      <View style={styles.spacer} />
      <View style={[styles.button, { backgroundColor: palette.primary }]} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    options: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 22,
    },
    option: {
      flex: 1,
      alignItems: 'center',
    },
    mini: {
      alignSelf: 'stretch',
      height: 200,
      borderRadius: 18,
      overflow: 'hidden',
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    miniOn: {
      borderWidth: 2,
      borderColor: theme.colors.accent,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.muted,
      marginBottom: 6,
    },
    radioOn: {
      borderWidth: 6,
      borderColor: theme.colors.accent,
    },
    optionLabel: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    auto: {
      flex: 1,
      flexDirection: 'row',
    },
    sketch: {
      flex: 1,
      paddingHorizontal: 9,
      paddingVertical: 12,
    },
    bar: {
      height: 10,
      width: '55%',
      borderRadius: 6,
      opacity: 0.85,
    },
    block: {
      borderRadius: 6,
      borderWidth: StyleSheet.hairlineWidth,
      marginTop: 6,
    },
    card: {
      height: 66,
    },
    row: {
      height: 22,
    },
    spacer: {
      flex: 1,
    },
    button: {
      height: 18,
      borderRadius: 6,
    },
  });
