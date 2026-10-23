import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usesTwentyFourHourClock } from '@/lib/clock-time';
import { type Theme, useThemedStyles, withAlpha } from '@/theme';
import {
  type ClockTime,
  type DayPeriod,
  clockTimeFromMinuteOfDay,
  minuteOfDayFromClockTime,
} from './constants/minute-of-day';

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const HOURS_24 = Array.from({ length: 24 }, (_unused, index) => index);
const MINUTES = Array.from({ length: 60 }, (_unused, index) => index);
const PERIODS: DayPeriod[] = ['am', 'pm'];
const MINUTES_PER_HOUR = 60;

const twoDigits = (value: number) => String(value).padStart(2, '0');

/** Any time of day, on the phone's own 12- or 24-hour clock. */
export function TimePickerModal({
  initialMinute,
  onCancel,
  onConfirm,
  title = 'Reminder time',
  visible,
}: {
  visible: boolean;
  initialMinute: number;
  onConfirm: (minuteOfDay: number) => void;
  onCancel: () => void;
  title?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const [time, setTime] = useState<ClockTime>(() => clockTimeFromMinuteOfDay(initialMinute));
  const isTwentyFourHour = usesTwentyFourHourClock();
  const hour24 = Math.floor(minuteOfDayFromClockTime(time) / MINUTES_PER_HOUR);

  useEffect(() => {
    if (visible) {
      setTime(clockTimeFromMinuteOfDay(initialMinute));
    }
  }, [initialMinute, visible]);

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <Pressable accessibilityLabel="Close" onPress={onCancel} style={styles.backdrop}>
        <Pressable onPress={() => undefined} style={styles.panel}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <View style={styles.columns}>
            {isTwentyFourHour ? (
              <Wheel
                format={twoDigits}
                label="Hour"
                onSelect={(hour) =>
                  setTime((current) =>
                    clockTimeFromMinuteOfDay(hour * MINUTES_PER_HOUR + current.minute),
                  )
                }
                options={HOURS_24}
                selected={hour24}
              />
            ) : (
              <Wheel
                label="Hour"
                onSelect={(hour12) => setTime((current) => ({ ...current, hour12 }))}
                options={HOURS_12}
                selected={time.hour12}
              />
            )}
            <Wheel
              format={twoDigits}
              label="Min"
              onSelect={(minute) => setTime((current) => ({ ...current, minute }))}
              options={MINUTES}
              selected={time.minute}
            />
            {isTwentyFourHour ? null : (
              <Wheel
                format={(value) => String(value).toUpperCase()}
                label=" "
                onSelect={(period) => setTime((current) => ({ ...current, period }))}
                options={PERIODS}
                selected={time.period}
              />
            )}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onCancel}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onConfirm(minuteOfDayFromClockTime(time))}
              testID="time-picker-confirm"
            >
              <Text style={styles.confirm}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Wheel<T extends string | number>({
  format = String,
  label,
  onSelect,
  options,
  selected,
}: {
  format?: (value: T) => string;
  label: string;
  onSelect: (value: T) => void;
  options: readonly T[];
  selected: T;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wheel}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <ScrollView style={styles.wheelList}>
        {options.map((option) => {
          const isSelected = option === selected;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={String(option)}
              onPress={() => onSelect(option)}
              style={[styles.wheelItem, isSelected ? styles.wheelItemSelected : null]}
            >
              <Text style={[styles.wheelText, isSelected ? styles.wheelTextSelected : null]}>
                {format(option)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    panel: {
      backgroundColor: theme.colors.surface,
      borderRadius: 26,
      padding: spacing.lg - spacing.xs,
      gap: spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      textAlign: 'center',
    },
    columns: {
      flexDirection: 'row',
      gap: spacing.sm,
      height: 220,
    },
    wheel: {
      flex: 1,
      gap: spacing.xs,
    },
    wheelLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      textAlign: 'center',
    },
    wheelList: {
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: radii.md,
    },
    wheelItem: {
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelItemSelected: {
      backgroundColor: withAlpha(theme.colors.text, 0.1),
    },
    wheelText: {
      color: theme.colors.muted,
      fontSize: fontSize.md,
    },
    wheelTextSelected: {
      color: theme.colors.text,
      fontWeight: fontWeight.semibold,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
    },
    cancel: {
      color: theme.colors.muted,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    confirm: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  });
