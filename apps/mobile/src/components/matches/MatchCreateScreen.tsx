import type { Crew } from '@product/client';
import { spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckPageNav, DeckSheetMessage } from '@/components/deck';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { ActivitySheet, HowYouWinSheet } from './CreateRuleSheets';
import { CreateSettingRow } from './CreateSettingRow';
import { GroupCard, GroupCardLine } from './GroupCard';
import { GroupPage } from './GroupPage';
import { HowLongSheet } from './HowLongSheet';
import type { CreatePrefill } from './group-rerun';
import { groupRuleBody, groupRuleTitle } from './group-rule-copy';
import { CREATE_COPY, MATCH_MODE_LABEL } from './match-copy';
import type { MatchLengthChoice } from './match-length';
import {
  MATCH_ANY_DAILY_CHOICE,
  MATCH_ANY_DAILY_LABEL,
  MATCH_METRIC_LABEL,
  type MatchActivityChoice,
} from './match-metric';
import { useCreateGroup } from './useCreateGroup';
import { WhosInSheet } from './WhosInSheet';

type CreateSheet = 'mode' | 'activity' | 'length' | 'crew';

const PRESET_LABEL = {
  today: CREATE_COPY.today,
  week: CREATE_COPY.week,
  month: CREATE_COPY.month,
} as const;

function lengthLabel(length: MatchLengthChoice): string {
  return length.kind === 'preset'
    ? PRESET_LABEL[length.window]
    : `${length.days} ${CREATE_COPY.daysUnit}`;
}

function activityLabel(choice: MatchActivityChoice): string {
  return choice === MATCH_ANY_DAILY_CHOICE ? MATCH_ANY_DAILY_LABEL : MATCH_METRIC_LABEL[choice];
}

function whosInLabel(crews: readonly Crew[], crewId: string | null): string {
  return crews.find((crew) => crew.id === crewId)?.name ?? CREATE_COPY.newGroupByLink;
}

/**
 * Starting a group is one screen. The card on top is the invite your friends
 * will see, rewritten as the four rows under it change.
 */
export function MatchCreateScreen({ prefill }: { prefill: CreatePrefill }) {
  const styles = useThemedStyles(createStyles);
  const group = useCreateGroup(prefill);
  const [openSheet, setOpenSheet] = useState<CreateSheet | null>(null);
  const close = () => setOpenSheet(null);
  const lengthText = lengthLabel(group.length);

  return (
    <>
      <GroupPage
        dock={
          <>
            {group.hasFailed ? (
              <DeckSheetMessage message={CREATE_COPY.failed} testID="match-create-failed" />
            ) : null}
            <DeckButton
              glyph={group.crewId ? undefined : 'share'}
              label={group.crewId ? CREATE_COPY.ctaCrew : CREATE_COPY.cta}
              loading={group.isStarting}
              onPress={group.start}
              testID="match-create-submit"
            />
          </>
        }
        nav={
          <DeckPageNav
            isClose
            onBack={() => goBackOrHome('/(tabs)/challenges')}
            title={CREATE_COPY.title}
          />
        }
        testID="match-create-screen"
      >
        <GroupCard
          corner={lengthText}
          rules={group.rules}
          size="rule"
          testID="match-create-card"
          title={groupRuleTitle(group.rules)}
        >
          <GroupCardLine>{groupRuleBody(group.rules)}</GroupCardLine>
        </GroupCard>
        <View style={styles.rows}>
          <CreateSettingRow
            isFirst
            label={CREATE_COPY.howYouWin}
            onPress={() => setOpenSheet('mode')}
            testID="match-create-mode"
            value={MATCH_MODE_LABEL[group.rules.scoringMode]}
          />
          <CreateSettingRow
            label={CREATE_COPY.activity}
            onPress={() => setOpenSheet('activity')}
            testID="match-create-activity"
            value={activityLabel(group.activityChoice)}
          />
          <CreateSettingRow
            label={CREATE_COPY.howLong}
            onPress={() => setOpenSheet('length')}
            testID="match-create-length"
            value={lengthText}
          />
          <CreateSettingRow
            label={CREATE_COPY.whosIn}
            onPress={group.crews.length > 0 ? () => setOpenSheet('crew') : undefined}
            testID="match-create-crew"
            value={whosInLabel(group.crews, group.crewId)}
          />
        </View>
        <Text style={styles.note}>{CREATE_COPY.note}</Text>
      </GroupPage>

      <HowYouWinSheet
        onChoose={group.chooseMode}
        onClose={close}
        rules={group.rules}
        visible={openSheet === 'mode'}
      />
      <ActivitySheet
        activityChoice={group.activityChoice}
        onChoose={group.chooseActivity}
        onClose={close}
        rules={group.rules}
        visible={openSheet === 'activity'}
      />
      <HowLongSheet
        length={group.length}
        onChoose={group.chooseLength}
        onClose={close}
        scoringMode={group.rules.scoringMode}
        visible={openSheet === 'length'}
      />
      <WhosInSheet
        crewId={group.crewId}
        crews={group.crews}
        onChoose={group.chooseCrew}
        onClose={close}
        visible={openSheet === 'crew'}
      />
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    rows: {
      marginTop: 12,
    },
    note: {
      color: theme.colors.muted,
      fontSize: 14.5,
      lineHeight: 21,
      marginTop: 14,
      paddingHorizontal: spacing.xs,
    },
  });
