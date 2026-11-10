import { fontSize, fontWeight, spacing } from '@product/brand';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { SHARE_COPY } from './constants/doing-copy';
import { SHARE_FILL_OPTIONS, type ShareFillId } from './share-fill';

/**
 * Horizontal swatches for recolouring a share poster before capture. Selection
 * is local to the screen — nothing is persisted.
 */
export function ShareFillCarousel({
  selected,
  onSelect,
  testID = 'share-fill-carousel',
}: {
  selected: ShareFillId;
  onSelect: (id: ShareFillId) => void;
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.label}>{SHARE_COPY.colour}</Text>
      <ScrollView
        contentContainerStyle={styles.row}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {SHARE_FILL_OPTIONS.map((option) => {
          const isSelected = option.id === selected;
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={[
                styles.swatch,
                { backgroundColor: option.hex },
                option.id === 'clinic' ? styles.clinic : null,
                isSelected ? styles.selected : null,
              ]}
              testID={`share-fill-${option.id}`}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    label: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 4,
      paddingRight: 8,
    },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    clinic: {
      borderColor: theme.colors.border,
    },
    selected: {
      borderWidth: 3,
      borderColor: theme.colors.accent,
    },
  });
