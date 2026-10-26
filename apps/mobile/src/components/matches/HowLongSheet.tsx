import type { MatchScoringMode, MatchWindow } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import {
  MATCH_LENGTH_MAX_DAYS,
  isWindowAllowedForScoringMode,
  matchWindowSchema,
} from '@product/contract/match-board';
import { StyleSheet, Text, View } from 'react-native';
import { DeckRoundButton, DeckSheetModal } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { SheetDone } from './CreateRuleSheets';
import { CREATE_COPY } from './match-copy';
import {
  MATCH_CUSTOM_DAYS_DEFAULT,
  type MatchLengthChoice,
  clampCustomDays,
  customDaysFloor,
  lengthEndHint,
} from './match-length';
import { SheetTile } from './SheetChoice';

const WINDOW_LABEL: Record<MatchWindow, string> = {
  today: CREATE_COPY.today,
  week: CREATE_COPY.week,
  month: CREATE_COPY.month,
};

interface HowLongSheetProps {
  visible: boolean;
  onClose: () => void;
  scoringMode: MatchScoringMode;
  length: MatchLengthChoice;
  onChoose: (length: MatchLengthChoice) => void;
}

/** The usual lengths as big tiles; Other opens a day count up to a year. */
export function HowLongSheet({
  visible,
  onClose,
  scoringMode,
  length,
  onChoose,
}: HowLongSheetProps) {
  const styles = useThemedStyles(createStyles);
  const isCustom = length.kind === 'custom';

  return (
    <DeckSheetModal
      footer={<SheetDone onClose={onClose} />}
      onDismiss={onClose}
      testID="match-create-length-sheet"
      title={CREATE_COPY.howLongTitle}
      visible={visible}
    >
      <View style={styles.grid}>
        {matchWindowSchema.options.map((window) => {
          const isAllowed = isWindowAllowedForScoringMode(scoringMode, window);
          return (
            <SheetTile
              hint={
                isAllowed ? lengthEndHint({ kind: 'preset', window }) : CREATE_COPY.streakNeedsTwo
              }
              isDisabled={!isAllowed}
              isSelected={length.kind === 'preset' && length.window === window}
              key={window}
              onPress={() => onChoose({ kind: 'preset', window })}
              testID={`match-window-${window}`}
              title={WINDOW_LABEL[window]}
            />
          );
        })}
        <SheetTile
          hint={isCustom ? lengthEndHint(length) : CREATE_COPY.otherHint}
          isSelected={isCustom}
          onPress={() =>
            onChoose({
              kind: 'custom',
              days: clampCustomDays(MATCH_CUSTOM_DAYS_DEFAULT, scoringMode),
            })
          }
          testID="match-window-custom"
          title={CREATE_COPY.other}
        />
      </View>
      {isCustom ? (
        <DayStepper
          days={length.days}
          floor={customDaysFloor(scoringMode)}
          onChange={(days) => onChoose({ kind: 'custom', days })}
        />
      ) : null}
    </DeckSheetModal>
  );
}

function DayStepper({
  days,
  floor,
  onChange,
}: {
  days: number;
  floor: number;
  onChange: (days: number) => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stepper} testID="match-window-days">
      <DeckRoundButton
        accessibilityLabel={CREATE_COPY.fewerDays}
        disabled={days <= floor}
        glyph="minus"
        onPress={() => onChange(days - 1)}
        onSurface
        testID="match-window-days-fewer"
      />
      <Text style={styles.value}>
        {days}
        <Text style={styles.unit}> {CREATE_COPY.daysUnit}</Text>
      </Text>
      <DeckRoundButton
        accessibilityLabel={CREATE_COPY.moreDays}
        disabled={days >= MATCH_LENGTH_MAX_DAYS}
        glyph="plus"
        onPress={() => onChange(days + 1)}
        onSurface
        testID="match-window-days-more"
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: spacing.md,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      marginTop: spacing.md,
    },
    value: {
      minWidth: 120,
      textAlign: 'center',
      color: theme.colors.text,
      fontSize: 40,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1,
    },
    unit: {
      color: theme.colors.muted,
      fontSize: 16,
      fontWeight: fontWeight.medium,
      letterSpacing: 0,
    },
  });
