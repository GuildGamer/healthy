import { fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckSheetFooter,
  DeckSheetMessage,
  DeckSheetSub,
} from '@/components/deck';
import { Glyph } from '@/components/icons';
import { formatClockTime } from '@/lib/clock-time';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { REMINDER_MOMENTS, type ReminderMoment } from './constants/reminder-moments';
import { REMINDER_COPY } from './constants/routine-copy';
import { momentAt } from './reminder-moments';
import { SettingRow } from './SettingRow';
import { TimePickerModal } from './TimePickerModal';

interface ReminderMomentPickerProps {
  /** Why the first pick suits this challenge, such as "This one fits well after lunch." */
  hint: string;
  initialMinute: number;
  onSave: (minuteOfDay: number) => void;
  saveLabel?: string;
  isSaving?: boolean;
  error?: string | null;
}

/** Four moments of the day, one already picked for this challenge; any other time is a tap away. */
export function ReminderMomentPicker({
  hint,
  initialMinute,
  onSave,
  saveLabel = REMINDER_COPY.save,
  isSaving = false,
  error = null,
}: ReminderMomentPickerProps) {
  const styles = useThemedStyles(createStyles);
  const [minuteOfDay, setMinuteOfDay] = useState(initialMinute);
  const [isClockOpen, setIsClockOpen] = useState(false);
  const isOwnTime = momentAt(minuteOfDay) === null;

  return (
    <View testID="reminder-moment-picker">
      <DeckSheetSub>{hint}</DeckSheetSub>
      <View style={styles.grid}>
        {REMINDER_MOMENTS.map((moment) => (
          <MomentTile
            isSelected={moment.minuteOfDay === minuteOfDay}
            key={moment.id}
            moment={moment}
            onPress={() => setMinuteOfDay(moment.minuteOfDay)}
          />
        ))}
      </View>
      <SettingRow
        isFirst
        label={REMINDER_COPY.anotherTime}
        onPress={() => setIsClockOpen(true)}
        testID="reminder-another-time"
        value={isOwnTime ? formatClockTime(minuteOfDay) : null}
      />
      {error ? <DeckSheetMessage message={error} /> : null}
      <DeckSheetFooter>
        <View style={styles.action}>
          <DeckButton
            label={saveLabel}
            loading={isSaving}
            onPress={() => onSave(minuteOfDay)}
            testID="reminder-save"
          />
        </View>
      </DeckSheetFooter>
      <TimePickerModal
        initialMinute={minuteOfDay}
        onCancel={() => setIsClockOpen(false)}
        onConfirm={(picked) => {
          setMinuteOfDay(picked);
          setIsClockOpen(false);
        }}
        visible={isClockOpen}
      />
    </View>
  );
}

function MomentTile({
  moment,
  isSelected,
  onPress,
}: {
  moment: ReminderMoment;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={`${moment.label}, ${formatClockTime(moment.minuteOfDay)}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.tile, isSelected ? styles.selectedTile : null]}
      testID={`reminder-moment-${moment.id}`}
    >
      <View style={styles.tileLabel}>
        <Glyph color={colors.muted} name={moment.glyph} size={13} strokeWidth={2} />
        <Text style={styles.tileLabelText}>{moment.label}</Text>
      </View>
      <Text style={styles.tileTime}>{formatClockTime(moment.minuteOfDay)}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 18,
      marginBottom: 10,
    },
    tile: {
      flexBasis: '47%',
      flexGrow: 1,
      height: 72,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedTile: {
      borderColor: theme.colors.text,
    },
    tileLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tileLabelText: {
      color: theme.colors.muted,
      fontSize: 12.5,
    },
    tileTime: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.4,
      marginTop: 2,
    },
    action: {
      marginTop: spacing.md,
    },
  });
