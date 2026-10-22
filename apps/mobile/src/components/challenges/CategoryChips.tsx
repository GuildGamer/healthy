import type { HealthCategory } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { healthCategoryName } from '@/constants/health-categories';
import { type Theme, useThemedStyles } from '@/theme';
import { CATALOG_COPY } from './constants/routine-copy';
import type { CatalogFilter } from './types/routine';

const CHIP_HEIGHT = 34;

/** All, then one chip per category, to narrow the catalogue to what you came for. */
export function CategoryChips({
  categories,
  selected,
  onSelect,
}: {
  categories: readonly HealthCategory[];
  selected: CatalogFilter;
  onSelect: (filter: CatalogFilter) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const filters: CatalogFilter[] = ['all', ...categories];

  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      testID="catalog-chips"
    >
      {filters.map((filter) => {
        const isSelected = filter === selected;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            key={filter}
            onPress={() => onSelect(filter)}
            style={[styles.chip, isSelected ? styles.selectedChip : null]}
            testID={`catalog-chip-${filter}`}
          >
            <Text style={[styles.label, isSelected ? styles.selectedLabel : null]}>
              {filter === 'all' ? CATALOG_COPY.allFilter : healthCategoryName(filter)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scroller: {
      marginHorizontal: -20,
      marginTop: 14,
      marginBottom: 6,
      flexGrow: 0,
    },
    row: {
      gap: spacing.sm,
      paddingHorizontal: 20,
    },
    chip: {
      height: CHIP_HEIGHT,
      borderRadius: CHIP_HEIGHT / 2,
      paddingHorizontal: 14,
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    selectedChip: {
      backgroundColor: theme.colors.text,
    },
    label: {
      color: theme.colors.muted,
      fontSize: 13.5,
      fontWeight: fontWeight.medium,
    },
    selectedLabel: {
      color: theme.colors.background,
    },
  });
