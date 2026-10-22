import type { InboxNotification } from '@product/client';
import { fontWeight, radii, spacing } from '@product/brand';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckDisc, type DeckCardKind } from '@/components/deck';
import { hrefForPushData, isNavigablePushData } from '@/lib/open-push-destination';
import { type Theme, useThemedStyles } from '@/theme';
import { INBOX_GLYPH } from './constants/inbox';
import { inboxTimeLabel, localDayKey } from './inbox-sections';

interface NotificationRowProps {
  notification: InboxNotification;
  /** The challenge it is about, when today's list knows it, for its colour. */
  kind: DeckCardKind | null;
  isFirst: boolean;
  now: Date;
}

/** Where a tap goes: the row's own destination, or the day a missed photo check cost points. */
function destinationFor(notification: InboxNotification): Href | null {
  if (isNavigablePushData(notification.payload)) {
    return hrefForPushData(notification.payload);
  }

  if (notification.kind === 'penalty') {
    return `/history/${localDayKey(new Date(notification.createdAt))}`;
  }

  return null;
}

/** A record of something that happened, tinted until it has been seen. */
export function NotificationRow({ notification, kind, isFirst, now }: NotificationRowProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const destination = destinationFor(notification);
  const isUnread = !notification.isRead;
  const rowStyle = [
    styles.row,
    isFirst || isUnread ? null : styles.divider,
    isUnread ? styles.unread : null,
  ];
  const content = (
    <>
      <DeckDisc glyph={INBOX_GLYPH[notification.kind]} kind={kind} />
      <View style={styles.text}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={styles.title}>
            {notification.title}
          </Text>
          <Text style={styles.time}>{inboxTimeLabel(notification.createdAt, now)}</Text>
        </View>
        <Text style={styles.body}>{notification.body}</Text>
      </View>
    </>
  );

  if (!destination) {
    return (
      <View style={rowStyle} testID={`notification-${notification.id}`}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={notification.title}
      accessibilityRole="button"
      onPress={() => router.push(destination)}
      style={({ pressed }) => [...rowStyle, pressed ? styles.pressed : null]}
      testID={`notification-open-${notification.id}`}
    >
      {content}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: spacing.xs,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    unread: {
      marginHorizontal: -spacing.sm,
      paddingHorizontal: 12,
      borderRadius: radii.md + 2,
      backgroundColor: theme.colors.accentSurface,
    },
    pressed: {
      opacity: 0.7,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    titleLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    time: {
      color: theme.colors.muted,
      fontSize: 13,
    },
    body: {
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },
  });
