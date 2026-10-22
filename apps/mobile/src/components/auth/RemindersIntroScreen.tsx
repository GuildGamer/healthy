import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, InlineNotice } from '@/components/forms';
import { Glyph } from '@/components/icons';
import { formatClockTime } from '@/lib/clock-time';
import { type Theme, useTheme, useThemedStyles, withAlpha } from '@/theme';
import appIcon from '../../../assets/icon.png';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';
import { FrontDoorLayout, FrontDoorTitle } from './FrontDoorLayout';
import { useAnswerRemindersIntro, useReminderPreview } from './use-reminders-intro';

const BELL_ART_SIZE = 96;
const PREVIEW_ICON_SIZE = 36;
const REMINDER_TITLE = 'Do one now';

/**
 * Once, just before the first Today: what a reminder looks like and when it
 * comes, so the phone's permission prompt is never a surprise.
 */
export function RemindersIntroScreen({ onAnswered }: { onAnswered: () => void }) {
  const styles = useThemedStyles(createStyles);
  const { conditionTones } = useTheme();
  const preview = useReminderPreview();
  const answer = useAnswerRemindersIntro(preview.reminderMinute, onAnswered);

  if (preview.isPending) {
    return <ScreenLoader />;
  }

  return (
    <FrontDoorLayout
      dock={
        <>
          <FormButton
            disabled={preview.reminderMinute === null}
            label="Turn on reminders"
            loading={answer.isTurningOn}
            onPress={answer.turnOn}
            testID="reminders-intro-turn-on"
          />
          <Pressable
            accessibilityRole="button"
            disabled={answer.isTurningOn}
            onPress={answer.notNow}
            style={styles.notNow}
            testID="reminders-intro-not-now"
          >
            <Text style={styles.notNowLabel}>Not now</Text>
          </Pressable>
        </>
      }
      testID="reminders-intro"
    >
      <View style={styles.centre}>
        <View
          style={[
            styles.bellArt,
            { backgroundColor: withAlpha(conditionTones.hypertension, 0.14) },
          ]}
        >
          <Glyph color={conditionTones.hypertension} name="bell" size={40} strokeWidth={2} />
        </View>
        <FrontDoorTitle
          centered
          subtitle="Only when a challenge isn’t done yet. Change the time on each challenge."
          title="A nudge if it’s still open?"
        />
        {preview.reminderMinute !== null ? (
          <ReminderPreview
            challengeTitle={preview.challengeTitle}
            reminderMinute={preview.reminderMinute}
          />
        ) : null}
      </View>
      {answer.hasFailed ? (
        <InlineNotice icon="offline" message={CONNECTION_FAILED_MESSAGE} tone="error" />
      ) : null}
    </FrontDoorLayout>
  );
}

function ReminderPreview({
  reminderMinute,
  challengeTitle,
}: {
  reminderMinute: number;
  challengeTitle: string | null;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      accessibilityLabel={`Example reminder at ${formatClockTime(reminderMinute)}: ${REMINDER_TITLE}`}
      style={styles.preview}
    >
      <Image accessibilityIgnoresInvertColors source={appIcon} style={styles.previewIcon} />
      <View style={styles.previewText}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewApp}>Healthy</Text>
          <Text style={styles.previewTime}>{formatClockTime(reminderMinute)}</Text>
        </View>
        <Text style={styles.previewTitle}>{REMINDER_TITLE}</Text>
        {challengeTitle ? (
          <Text numberOfLines={1} style={styles.previewBody}>
            {challengeTitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    centre: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellArt: {
      width: BELL_ART_SIZE,
      height: BELL_ART_SIZE,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preview: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      padding: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surface,
    },
    previewIcon: {
      width: PREVIEW_ICON_SIZE,
      height: PREVIEW_ICON_SIZE,
      borderRadius: radii.sm,
    },
    previewText: {
      flex: 1,
    },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    previewApp: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    previewTime: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
    },
    previewTitle: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
    },
    previewBody: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
    notNow: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    notNowLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
    },
  });
