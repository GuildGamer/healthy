import Feather from '@expo/vector-icons/Feather';
import type { InboxNotification, NotificationKind } from '@product/client';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshableScroll, ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { formatRelativeTime } from './relative-time';

const kindIcon: Record<
  NotificationKind,
  'check-circle' | 'bell' | 'camera' | 'alert-circle'
> = {
  success: 'check-circle',
  reminder: 'bell',
  evidence: 'camera',
  penalty: 'alert-circle',
};

function closeInbox(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/(tabs)');
}

export function NotificationsScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView style={styles.container} testID="notifications-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => closeInbox(router)}
          style={styles.backButton}
          testID="notifications-back"
        >
          <Feather color={colors.muted} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {inboxQuery.isPending ? (
        <ScreenLoader testID="notifications-loading" />
      ) : (
        <RefreshableScroll
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContent : undefined
          }
          onPullRefresh={() => inboxQuery.refetch()}
          style={styles.list}
        >
          {notifications.length === 0 ? (
            <View style={styles.empty} testID="notifications-empty">
              <Feather color={colors.disabledText} name="bell" size={40} />
              <Text style={styles.emptyTitle}>No notifications</Text>
            </View>
          ) : (
            notifications.map((item, index) => (
              <NotificationRow
                isLast={index === notifications.length - 1}
                key={item.id}
                notification={item}
              />
            ))
          )}
        </RefreshableScroll>
      )}
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  isLast,
}: {
  notification: InboxNotification;
  isLast: boolean;
}) {
  return (
    <View testID={`notification-${notification.id}`}>
      <View
        style={[styles.row, notification.isRead ? null : styles.rowUnread]}
      >
        <Feather
          color={notification.isRead ? colors.muted : colors.accent}
          name={kindIcon[notification.kind]}
          size={16}
          style={styles.rowIcon}
        />
        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            <Text
              numberOfLines={1}
              style={[
                styles.rowTitle,
                notification.isRead ? null : styles.rowTitleUnread,
              ]}
            >
              {notification.title}
            </Text>
            <Text style={styles.rowTime}>
              {formatRelativeTime(notification.createdAt)}
            </Text>
          </View>
          <Text style={styles.rowText}>{notification.body}</Text>
        </View>
        {notification.isRead ? null : <View style={styles.unreadDot} />}
      </View>
      {isLast ? null : <View style={styles.divider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  list: {
    flex: 1,
  },
  emptyContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowUnread: {
    backgroundColor: colors.accentSurface,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  rowTitleUnread: {
    fontWeight: fontWeight.medium,
  },
  rowText: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  rowTime: {
    color: colors.disabledText,
    fontSize: fontSize.xs,
    flexShrink: 0,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
