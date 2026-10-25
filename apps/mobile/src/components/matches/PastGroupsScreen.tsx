import type { MatchListItem } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckNoteCard, DeckPageNav, DeckSectionTitle } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GroupPage } from './GroupPage';
import { GroupToneDisc } from './GroupToneDisc';
import { finishLabel, pastGroupMeta, pastGroupSections } from './group-history';
import { groupTitle } from './group-today';
import { GROUPS_COPY } from './match-copy';
import { formatBoardScore } from './match-metric';

/** A plain record of ended groups, newest first. Each opens its final board. */
export function PastGroupsScreen() {
  const listQuery = useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => apiClient.listMyMatches(),
  });
  const sections = pastGroupSections(listQuery.data?.ended ?? []);

  return (
    <GroupPage
      nav={
        <DeckPageNav
          onBack={() => goBackOrHome('/(tabs)/challenges')}
          title={GROUPS_COPY.pastGroups}
        />
      }
      onPullRefresh={() => listQuery.refetch()}
      testID="matches-past-screen"
    >
      {listQuery.isError ? (
        <DeckNoteCard
          action={{ label: GROUPS_COPY.tryAgain, onPress: () => void listQuery.refetch() }}
          body={GROUPS_COPY.loadFailedBody}
          glyph="offline"
          title={GROUPS_COPY.loadFailedTitle}
        />
      ) : null}
      {sections.map((section, sectionIndex) => (
        <View key={section.label}>
          <DeckSectionTitle isFirst={sectionIndex === 0} label={section.label} />
          {section.items.map((item, index) => (
            <PastGroupRow isFirst={index === 0} item={item} key={item.id} />
          ))}
        </View>
      ))}
    </GroupPage>
  );
}

function pastScoreLabel(item: MatchListItem): string {
  const formatted = formatBoardScore(item.scoringMode, item.metric, item.yourScore);
  return formatted.unit ? `${formatted.value} ${formatted.unit}` : formatted.value;
}

function PastGroupRow({ item, isFirst }: { item: MatchListItem; isFirst: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const standings = item.standings ?? item.roster;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.navigate(`/matches/${item.id}`)}
      style={({ pressed }) => [
        styles.row,
        isFirst ? null : styles.divided,
        pressed ? styles.pressed : null,
      ]}
      testID={`past-match-${item.id}`}
    >
      <GroupToneDisc rules={item} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.title}>
          {groupTitle(standings, item)}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {pastGroupMeta(item)}
        </Text>
      </View>
      <View style={styles.side}>
        <Text style={styles.place}>{finishLabel(item)}</Text>
        <Text style={styles.meta}>{pastScoreLabel(item)}</Text>
      </View>
      <Glyph color={colors.muted} name="forward" size={16} strokeWidth={2} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: spacing.xs,
    },
    divided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    side: {
      alignItems: 'flex-end',
    },
    place: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  });
