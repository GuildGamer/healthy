import { colors, fontSize, fontWeight, radii } from '@product/brand';
import type { HealthCategory } from '@product/client';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  SelectBand,
  SelectOptionRow,
  SelectSheet,
  SelectTrigger,
} from '@/components/forms/SelectField';
import {
  healthCategoryMark,
  healthCategoryName,
} from '@/constants/health-categories';
import { ChallengeIcon } from './ChallengeIcon';
import {
  type CatalogCategoryFilter,
  labelForCatalogCategory,
} from './manage-catalog-layout';

type CategoryOption = {
  id: CatalogCategoryFilter;
  label: string;
  count: number;
};

/** Catalog category menu — built on the shared SelectField band. */
export function CatalogCategoryPicker({
  categories,
  countsByCategory,
  onSelect,
  selected,
  totalInScope,
}: {
  categories: readonly HealthCategory[];
  countsByCategory: ReadonlyMap<HealthCategory, number>;
  onSelect: (category: CatalogCategoryFilter) => void;
  selected: CatalogCategoryFilter;
  totalInScope: number;
}) {
  const [open, setOpen] = useState(false);

  if (categories.length === 0) {
    return null;
  }

  const options: CategoryOption[] = [
    ...(categories.length > 1
      ? [{ id: 'all' as const, label: 'All categories', count: totalInScope }]
      : []),
    ...categories.map((category) => ({
      id: category,
      label: healthCategoryName(category),
      count: countsByCategory.get(category) ?? 0,
    })),
  ];

  function select(next: CatalogCategoryFilter) {
    onSelect(next);
    setOpen(false);
  }

  return (
    <>
      <SelectBand>
        <SelectTrigger
          accessibilityHint="Opens the category list"
          accessibilityLabel={`Category, ${labelForCatalogCategory(selected)}`}
          label="Category"
          leading={
            selected === 'all' ? null : (
              <ChallengeIcon
                category={selected}
                name={healthCategoryMark(selected)}
                size="sm"
              />
            )
          }
          onPress={() => setOpen(true)}
          testID="catalog-category-menu"
          value={labelForCatalogCategory(selected)}
        />
      </SelectBand>

      <SelectSheet
        closeTestID="catalog-category-close"
        onClose={() => setOpen(false)}
        testID="catalog-category-sheet"
        title="Category"
        visible={open}
      >
        {options.map((option) => (
          <SelectOptionRow
            key={option.id}
            leading={
              option.id === 'all' ? (
                <View style={styles.allMark}>
                  <Text style={styles.allMarkText}>All</Text>
                </View>
              ) : (
                <ChallengeIcon
                  category={option.id}
                  name={healthCategoryMark(option.id)}
                  size="sm"
                />
              )
            }
            meta={String(option.count)}
            onPress={() => select(option.id)}
            selected={option.id === selected}
            testID={`catalog-category-option-${option.id}`}
            title={option.label}
          />
        ))}
      </SelectSheet>
    </>
  );
}

const styles = StyleSheet.create({
  allMark: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  allMarkText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
  },
});
