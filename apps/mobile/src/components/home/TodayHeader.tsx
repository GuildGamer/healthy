import { fontSize, fontWeight, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SyncStatusLine,
  type SyncStatusTone,
} from '@/components/feedback/SyncStatusLine';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const INBOX_BUTTON_SIZE = 40;
const BELL_SIZE = 22;
const UNREAD_DOT_SIZE = 9;

export type TodayHeaderSyncStatus = {
  tone: SyncStatusTone;
  label: string;
  onPress?: () => void;
};

interface TodayHeaderProps {
  weekday: string;
  date: string;
  unreadCount: number;
  onOpenInbox: () => void;
  /** Quiet sync / attention line between the date and the inbox bell. */
  syncStatus?: TodayHeaderSyncStatus | null;
}

/** The day, optional sync status, and the inbox bell. */
export function TodayHeader({
  weekday,
  date,
  unreadCount,
  onOpenInbox,
  syncStatus = null,
}: TodayHeaderProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const hasUnread = unreadCount > 0;

  return (
    <View style={styles.row}>
      <View style={styles.dateBlock}>
        <Text accessibilityRole="header" style={styles.weekday}>
          {weekday}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      {syncStatus ? (
        <View style={styles.sync}>
          <SyncStatusLine
            compact
            label={syncStatus.label}
            onPress={syncStatus.onPress}
            testID="home-sync-status"
            tone={syncStatus.tone}
          />
        </View>
      ) : (
        <View style={styles.syncSpacer} />
      )}
      <Pressable
        accessibilityLabel={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onOpenInbox}
        testID="open-notifications"
      >
        <View style={styles.inbox} testID="home-inbox-bell">
          <Glyph color={colors.text} name="bell" size={BELL_SIZE} />
        </View>
        {hasUnread ? <View style={styles.unread} testID="home-unread-dot" /> : null}
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    dateBlock: {
      flexShrink: 1,
    },
    weekday: {
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.9,
    },
    date: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      marginTop: 3,
    },
    sync: {
      flex: 1,
      alignItems: 'flex-end',
      justifyContent: 'center',
      minWidth: 0,
      paddingRight: spacing.xs,
    },
    syncSpacer: {
      flex: 1,
    },
    inbox: {
      width: INBOX_BUTTON_SIZE,
      height: INBOX_BUTTON_SIZE,
      borderRadius: INBOX_BUTTON_SIZE / 2,
      backgroundColor: theme.colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unread: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: UNREAD_DOT_SIZE,
      height: UNREAD_DOT_SIZE,
      borderRadius: UNREAD_DOT_SIZE / 2,
      backgroundColor: theme.colors.danger,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
  });
