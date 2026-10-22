import type { MatchListItem } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { matchTimeLeft } from '@product/contract/match-board';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GroupFaceStack, stackFacesFrom } from './GroupFaceStack';
import { GroupToneDisc, PlainDisc } from './GroupToneDisc';
import { GROUPS_COPY } from './match-copy';
import { groupTitle, placeLabel, todayTally } from './group-today';

const MAX_LIST_FACES = 6;

/** A live group, answering the question it is opened for: who has done today? */
export function GroupListRow({
  item,
  isFirst,
  onPress,
}: {
  item: MatchListItem;
  isFirst: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const standings = item.standings ?? item.roster;
  const { done, total } = todayTally(standings);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isFirst ? null : styles.divided,
        pressed ? styles.pressed : null,
      ]}
      testID={`open-match-${item.id}`}
    >
      <GroupToneDisc rules={item} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.title}>
          {groupTitle(standings, item)}
        </Text>
        <View style={styles.today}>
          <GroupFaceStack
            faces={stackFacesFrom(standings.slice(0, MAX_LIST_FACES))}
            testID={`match-faces-${item.id}`}
          />
          <Text style={styles.meta}>{GROUPS_COPY.todayCount(done, total)}</Text>
        </View>
      </View>
      <View style={styles.side}>
        <Text style={styles.place}>{placeLabel(standings)}</Text>
        <Text style={styles.meta}>{matchTimeLeft(item.endsAt)}</Text>
      </View>
    </Pressable>
  );
}

/** Every ended group folded into one row: they are history, not today. */
export function PastGroupsRow({ summary, onPress }: { summary: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.pastRow, pressed ? styles.pressed : null]}
      testID="matches-past"
    >
      <PlainDisc glyph="clock" />
      <View style={styles.text}>
        <Text style={styles.title}>{GROUPS_COPY.pastGroups}</Text>
        <Text style={styles.metaLine}>{summary}</Text>
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
    pastRow: {
      marginTop: spacing.sm,
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
    today: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 6,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: 13,
    },
    metaLine: {
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
