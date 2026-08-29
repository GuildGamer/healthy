import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { HealthCategory } from '@product/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { healthCategories } from '@/constants/health-categories';
import { apiClient } from '@/lib/api';

function CategoryToggle({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryRow,
        pressed ? styles.categoryRowPressed : null,
      ]}
    >
      <Text style={styles.categoryLabel}>{label}</Text>
      <View
        style={[styles.checkbox, isSelected ? styles.checkboxChecked : null]}
      >
        {isSelected ? (
          <Feather color={colors.onAccent} name="check" size={14} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function ManageCategoriesScreen() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const updateCategories = useMutation({
    mutationFn: (categories: HealthCategory[]) =>
      apiClient.updateCategories({ categories }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
      ]);
    },
  });

  const selected = meQuery.data?.categories ?? [];

  function toggleCategory(category: HealthCategory) {
    const isSelected = selected.includes(category);
    const next = isSelected
      ? selected.filter((item) => item !== category)
      : [...selected, category];

    if (next.length === 0) {
      return;
    }

    updateCategories.mutate(next);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
      testID="manage-categories-screen"
    >
      <Text style={styles.intro}>
        Challenges are drawn from the conditions you select here.
      </Text>

      {meQuery.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.card}>
          {healthCategories.map((category, index) => (
            <View key={category.id}>
              <CategoryToggle
                isSelected={selected.includes(category.id)}
                label={category.name}
                onPress={() => toggleCategory(category.id)}
              />
              {index < healthCategories.length - 1 ? (
                <View style={styles.divider} />
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  intro: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  categoryRowPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  categoryLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
});
