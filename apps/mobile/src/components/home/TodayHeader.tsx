import { fontSize, fontWeight, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const INBOX_BUTTON_SIZE = 40;
const BELL_SIZE = 22;
const UNREAD_DOT_SIZE = 9;

interface TodayHeaderProps {
  weekday: string;
  date: string;
  unreadCount: number;
  onOpenInbox: () => void;
}

/** The day, and the inbox bell, which carries a dot when there is something new. */
export function TodayHeader({ weekday, date, unreadCount, onOpenInbox }: TodayHeaderProps) {
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
    },
    dateBlock: {
      flex: 1,
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
