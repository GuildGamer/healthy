import { colors, fontSize, fontWeight, radii } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChallengeIcon } from '@/components/challenges/ChallengeIcon';
import {
  SelectBand,
  SelectOptionRow,
  SelectSheet,
  SelectTrigger,
} from '@/components/forms/SelectField';
import { healthCategoryMark } from '@/constants/health-categories';
import {
  LEADERBOARD_CATEGORIES,
  labelForLeaderboardCategory,
  type LeaderboardCategoryFilter,
} from './leaderboard-filters';

/** Same select band as the catalog category menu. */
export function LeaderboardCategoryPicker({
  onSelect,
  selected,
}: {
  onSelect: (category: LeaderboardCategoryFilter) => void;
  selected: LeaderboardCategoryFilter;
}) {
  const [open, setOpen] = useState(false);

  function select(next: LeaderboardCategoryFilter) {
    onSelect(next);
    setOpen(false);
  }

  return (
    <>
      <SelectBand testID="leaderboard-category-switch">
        <SelectTrigger
          accessibilityHint="Opens the category list"
          accessibilityLabel={`Category, ${labelForLeaderboardCategory(selected)}`}
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
          testID="leaderboard-category-menu"
          value={labelForLeaderboardCategory(selected)}
        />
      </SelectBand>

      <SelectSheet
        closeTestID="leaderboard-category-close"
        onClose={() => setOpen(false)}
        testID="leaderboard-category-sheet"
        title="Category"
        visible={open}
      >
        {LEADERBOARD_CATEGORIES.map((option) => (
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
            onPress={() => select(option.id)}
            selected={option.id === selected}
            testID={`leaderboard-category-option-${option.id}`}
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
