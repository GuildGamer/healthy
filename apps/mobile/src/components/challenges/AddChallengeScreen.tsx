import type { CatalogChallenge, ChallengeFrequency, HealthCategory } from '@product/client';
import { spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckNoteCard, DeckPageNav, DeckToast, useDeckToast } from '@/components/deck';
import { healthCategoryName } from '@/constants/health-categories';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import {
  addedToastMessage,
  catalogCategoryOrder,
  catalogRowMeta,
  catalogSections,
  isMembersOnly,
  otherMembersOnlyCount,
  pickCatalogSuggestions,
} from './catalog-layout';
import { CONDITION_FEATURES_ENABLED } from '@/constants/product-scope';
import { ChallengePreviewSheet } from './ChallengePreviewSheet';
import { challengeProof } from './challenge-proof';
import { ChallengeRow } from './ChallengeRow';
import { CATALOG_COPY } from './constants/routine-copy';
import { CategoryChips } from './CategoryChips';
import { ListSectionTitle } from './ListSectionTitle';
import { RoutineSkeleton } from './RoutineSkeleton';
import { SuggestionTile } from './SuggestionTile';
import type { CatalogFilter, CatalogSection } from './types/routine';

/** Suggestions from your conditions first, then everything you could add, by category. */
export function AddChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const toast = useDeckToast();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const catalogQuery = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
  });
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });

  const catalog = catalogQuery.data?.challenges ?? [];
  const preview = catalog.find((challenge) => challenge.challengeId === previewId) ?? null;

  function handleAdded(frequency: ChallengeFrequency) {
    setPreviewId(null);
    toast.show(addedToastMessage(frequency));
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.nav}>
        <DeckPageNav
          onBack={() => goBackOrHome('/(tabs)/challenges')}
          testID="manage-challenges-screen"
          title={CATALOG_COPY.title}
        />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}>
        <CatalogBody
          catalog={catalog}
          categories={meQuery.data?.categories ?? []}
          hasFailed={catalogQuery.isError && !catalogQuery.data}
          isPending={catalogQuery.isPending}
          onOpen={setPreviewId}
          onRetry={() => void catalogQuery.refetch()}
        />
      </ScrollView>
      {toast.message ? (
        <DeckToast
          action={{ label: CATALOG_COPY.seeToday, onPress: () => router.navigate('/(tabs)') }}
          message={toast.message}
          onDismiss={toast.hide}
          testID="catalog-toast"
        />
      ) : null}
      <ChallengePreviewSheet
        challenge={preview}
        onAdded={handleAdded}
        onClose={() => setPreviewId(null)}
        otherMembersOnlyCount={preview ? otherMembersOnlyCount(catalog, preview.challengeId) : 0}
      />
    </View>
  );
}

function CatalogBody({
  catalog,
  categories,
  isPending,
  hasFailed,
  onOpen,
  onRetry,
}: {
  catalog: readonly CatalogChallenge[];
  categories: readonly HealthCategory[];
  isPending: boolean;
  hasFailed: boolean;
  onOpen: (challengeId: string) => void;
  onRetry: () => void;
}) {
  const [filter, setFilter] = useState<CatalogFilter>('all');

  if (isPending) {
    return <RoutineSkeleton />;
  }

  if (hasFailed) {
    return (
      <DeckNoteCard
        action={{ label: CATALOG_COPY.retry, onPress: onRetry, testID: 'catalog-retry' }}
        body={CATALOG_COPY.errorBody}
        glyph="offline"
        testID="catalog-error"
        title={CATALOG_COPY.errorTitle}
      />
    );
  }

  const order = catalogCategoryOrder(catalog, categories);
  const suggestions = filter === 'all' ? pickCatalogSuggestions(catalog, categories) : [];
  const sections = catalogSections(catalog, filter, order, suggestions);

  return (
    <View>
      {suggestions.length > 0 ? <Suggestions onOpen={onOpen} suggestions={suggestions} /> : null}
      {filter === 'all' ? <ListSectionTitle label={CATALOG_COPY.everythingTitle} /> : null}
      {CONDITION_FEATURES_ENABLED ? (
        <CategoryChips categories={order} onSelect={setFilter} selected={filter} />
      ) : null}
      {sections.length === 0 && suggestions.length === 0 ? (
        <EverythingAdded filter={filter} />
      ) : (
        sections.map((section) => (
          <CatalogSectionRows
            key={section.category}
            onOpen={onOpen}
            section={section}
            showTitle={filter === 'all'}
          />
        ))
      )}
    </View>
  );
}

function Suggestions({
  suggestions,
  onOpen,
}: {
  suggestions: readonly CatalogChallenge[];
  onOpen: (challengeId: string) => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View testID="catalog-suggestions">
      <ListSectionTitle isFirst label={CATALOG_COPY.suggestedTitle} />
      <ScrollView
        contentContainerStyle={styles.tiles}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tilesScroller}
      >
        {suggestions.map((challenge) => (
          <SuggestionTile
            challenge={challenge}
            key={challenge.challengeId}
            onPress={() => onOpen(challenge.challengeId)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CatalogSectionRows({
  section,
  showTitle,
  onOpen,
}: {
  section: CatalogSection;
  showTitle: boolean;
  onOpen: (challengeId: string) => void;
}) {
  return (
    <View testID={`catalog-section-${section.category}`}>
      {showTitle ? <ListSectionTitle label={healthCategoryName(section.category)} /> : null}
      {section.challenges.map((challenge, index) => (
        <ChallengeRow
          accessibilityHint="Shows how it works before adding it"
          accessory="chevron"
          challenge={challenge}
          isFirst={index === 0}
          key={challenge.challengeId}
          meta={catalogRowMeta(challengeProof(challenge).short, challenge.frequency)}
          onPress={() => onOpen(challenge.challengeId)}
          tag={isMembersOnly(challenge) ? CATALOG_COPY.membersTag : null}
          testID={`catalog-challenge-${challenge.challengeId}`}
        />
      ))}
    </View>
  );
}

function EverythingAdded({ filter }: { filter: CatalogFilter }) {
  const isAll = filter === 'all';
  return (
    <DeckNoteCard
      body={isAll ? CATALOG_COPY.everythingAddedBody : CATALOG_COPY.categoryAddedBody}
      glyph="check"
      testID="catalog-empty"
      title={
        isAll
          ? CATALOG_COPY.everythingAddedTitle
          : `You have every ${healthCategoryName(filter).toLowerCase()} challenge.`
      }
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    nav: {
      paddingHorizontal: 20,
    },
    content: {
      paddingHorizontal: 20,
    },
    tilesScroller: {
      marginHorizontal: -20,
      marginTop: spacing.sm,
    },
    tiles: {
      gap: 12,
      paddingHorizontal: 20,
    },
  });
