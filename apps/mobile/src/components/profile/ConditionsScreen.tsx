import type { HealthCategory } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InlineNotice } from '@/components/forms';
import { ConditionPickList } from '@/components/health/ConditionPickList';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { SETTINGS_SAVE_FAILED_MESSAGE } from './constants/settings-copy';
import { SettingsNote } from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import { ME_QUERY_KEY, useMe } from './useMe';

/** Tick what you manage, at least one. New suggestions follow; added challenges stay. */
export function ConditionsScreen() {
  const queryClient = useQueryClient();
  const picked = useMe().data?.categories ?? [];

  const updateCategories = useMutation({
    mutationFn: (categories: HealthCategory[]) => apiClient.updateCategories({ categories }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['challenges'] }),
      ]),
  });

  function toggle(category: HealthCategory) {
    const next = picked.includes(category)
      ? picked.filter((item) => item !== category)
      : [...picked, category];

    if (next.length === 0) {
      return;
    }

    updateCategories.mutate(next);
  }

  return (
    <SettingsPage
      onBack={() => goBackOrHome('/settings')}
      testID="manage-categories-screen"
      title="Conditions"
    >
      <SettingsNote>We suggest challenges for what you tick. Only you see this.</SettingsNote>
      {updateCategories.isError ? (
        <InlineNotice icon="offline" message={SETTINGS_SAVE_FAILED_MESSAGE} tone="error" />
      ) : null}
      <ConditionPickList hasLines onToggle={toggle} picked={picked} />
      <SettingsNote>Challenges you’ve already added stay in your routine.</SettingsNote>
    </SettingsPage>
  );
}
