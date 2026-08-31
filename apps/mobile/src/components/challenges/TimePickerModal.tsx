import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  type ClockTime,
  type DayPeriod,
  clockTimeFromMinuteOfDay,
  minuteOfDayFromClockTime,
} from './constants/minute-of-day';
import { useEffect, useState } from 'react';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_unused, index) => index);
const PERIODS: DayPeriod[] = ['am', 'pm'];

export function TimePickerModal({
  initialMinute,
  onCancel,
  onConfirm,
  visible,
}: {
  visible: boolean;
  initialMinute: number;
  onConfirm: (minuteOfDay: number) => void;
  onCancel: () => void;
}) {
  const [time, setTime] = useState<ClockTime>(() =>
    clockTimeFromMinuteOfDay(initialMinute),
  );

  useEffect(() => {
    if (visible) {
      setTime(clockTimeFromMinuteOfDay(initialMinute));
    }
  }, [initialMinute, visible]);

  function selectHour(hour12: number) {
    setTime((current) => ({ ...current, hour12 }));
  }

  function selectMinute(minute: number) {
    setTime((current) => ({ ...current, minute }));
  }

  function selectPeriod(period: DayPeriod) {
    setTime((current) => ({ ...current, period }));
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <Pressable onPress={onCancel} style={styles.backdrop}>
        <Pressable onPress={() => undefined} style={styles.sheet}>
          <Text style={styles.title}>Reminder time</Text>
          <View style={styles.columns}>
            <Wheel
              label="Hour"
              onSelect={selectHour}
              options={HOURS}
              selected={time.hour12}
            />
            <Wheel
              format={(value) => String(value).padStart(2, '0')}
              label="Min"
              onSelect={selectMinute}
              options={MINUTES}
              selected={time.minute}
            />
            <Wheel
              format={(value) => String(value).toUpperCase()}
              label=" "
              onSelect={selectPeriod}
              options={PERIODS}
              selected={time.period}
            />
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.secondary}
            >
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onConfirm(minuteOfDayFromClockTime(time))}
              style={styles.primary}
              testID="time-picker-confirm"
            >
              <Text style={styles.primaryLabel}>Done</Text>
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
  return (
    <View style={styles.wheel}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <ScrollView style={styles.wheelList}>
        {options.map((option) => {
          const isSelected = option === selected;

          return (
            <Pressable
              key={String(option)}
              onPress={() => onSelect(option)}
              style={[
                styles.wheelItem,
                isSelected ? styles.wheelItemSelected : null,
              ]}
            >
              <Text
                style={[
                  styles.wheelText,
                  isSelected ? styles.wheelTextSelected : null,
                ]}
              >
                {format(option)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
    color: colors.muted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  wheelList: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
  },
  wheelItem: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemSelected: {
    backgroundColor: colors.accentContainer,
  },
  wheelText: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  wheelTextSelected: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondary: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  primary: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  primaryLabel: {
    color: colors.onAccent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
