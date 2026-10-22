import type { NotificationKind } from '@product/client';
import type { GlyphName } from '@/components/icons';

export const INBOX_GLYPH: Record<NotificationKind, GlyphName> = {
  success: 'check',
  reminder: 'bell',
  evidence: 'camera',
  penalty: 'camera',
  social: 'clap',
};

export const INBOX_COPY = {
  title: 'Notifications',
  today: 'Today',
  earlier: 'Earlier',
  photoCheck: 'Photo check',
  openCamera: 'Open camera',
  left: 'left',
  emptyTitle: 'Nothing yet',
  emptyBody: 'Reminders, cheers from your groups, and anything that needs you will show up here.',
  failedTitle: 'Your notifications didn’t load.',
  failedBody: 'Check your connection and try again.',
  tryAgain: 'Try again',
} as const;
