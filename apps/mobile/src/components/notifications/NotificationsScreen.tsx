import Feather from '@expo/vector-icons/Feather';
import type { InboxNotification, NotificationKind } from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiClient } from '@/lib/api';
import { formatRelativeTime } from './relative-time';

const kindIcon: Record<NotificationKind, 'check-circle' | 'bell'> = {
  success: 'check-circle',
  reminder: 'bell',
};

export function NotificationsScreen() {
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.listNotifications(),
  });

  const unreadCount = inboxQuery.data?.unreadCount ?? 0;

  useFocusEffect(
    useCallback(() => {
      if (unreadCount === 0) {
        return;
      }

      void apiClient.markNotificationsRead().then(() => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
    }, [queryClient, unreadCount]),
  );

  const notifications = inboxQuery.data?.notifications ?? [];

  if (inboxQuery.isPending) {
    return (
      <View style={styles.centred} testID="notifications-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => inboxQuery.refetch()}
          refreshing={inboxQuery.isRefetching}
          tintColor={colors.accent}
        />
      }
      style={styles.container}
      testID="notifications-screen"
    >
      {notifications.length === 0 ? (
        <View style={styles.empty} testID="notifications-empty">
          <Feather color={colors.muted} name="bell" size={28} />
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptyBody}>
            Challenge reminders and completions will land here.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications.map((item) => (
            <NotificationRow key={item.id} notification={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function NotificationRow({
  notification,
}: {
  notification: InboxNotification;
}) {
  return (
    <View
      style={[styles.row, notification.isRead ? null : styles.rowUnread]}
      testID={`notification-${notification.id}`}
    >
      <View
        style={[
          styles.icon,
          notification.isRead ? styles.iconRead : styles.iconUnread,
        ]}
      >
        <Feather
          color={notification.isRead ? colors.muted : colors.accent}
          name={kindIcon[notification.kind]}
          size={16}
        />
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowTitle,
            notification.isRead ? null : styles.rowTitleUnread,
          ]}
        >
          {notification.title}
        </Text>
        <Text style={styles.rowText}>{notification.body}</Text>
        <Text style={styles.rowTime}>
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>
      {notification.isRead ? null : <View style={styles.unreadDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowUnread: {
    backgroundColor: colors.accentSurface,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRead: {
    backgroundColor: colors.surfaceRaised,
  },
  iconUnread: {
    backgroundColor: colors.accentContainer,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  rowTitleUnread: {
    fontWeight: fontWeight.semibold,
  },
  rowText: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  rowTime: {
    color: colors.disabledText,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
