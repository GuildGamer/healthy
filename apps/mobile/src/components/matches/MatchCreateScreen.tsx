import type { Crew } from '@product/client';
import { MATCH_TITLE_MAX } from '@product/contract/match-board';
import { spacing } from '@product/brand';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckPageNav,
  DeckSheetMessage,
  DeckSheetModal,
  DeckSheetTitle,
} from '@/components/deck';
import { TextField } from '@/components/forms/TextField';
import { goBackOrHome } from '@/lib/go-back';
import { apiClient } from '@/lib/api';
import { type Theme, useThemedStyles } from '@/theme';
import { ActivitySheet, HowYouWinSheet, SheetDone } from './CreateRuleSheets';
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
import { WhosInSheet, type WhosInSelection } from './WhosInSheet';

type CreateSheet = 'mode' | 'activity' | 'length' | 'crew' | 'rename';

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

function whosInLabel(crews: readonly Crew[], selection: WhosInSelection): string {
  const crewName = crews.find((crew) => crew.id === selection.crewId)?.name;
  const people = selection.participantUserIds.length;
  if (crewName && people > 0) {
    return CREATE_COPY.peopleAndCrew(people, crewName);
  }
  if (crewName) {
    return crewName;
  }
  if (people > 0) {
    return CREATE_COPY.peoplePicked(people);
  }
  return CREATE_COPY.newGroupByLink;
}

/**
 * Starting a group is one screen. The card on top is the invite your friends
 * will see, rewritten as the four rows under it change.
 */
export function MatchCreateScreen({ prefill }: { prefill: CreatePrefill }) {
  const styles = useThemedStyles(createStyles);
  const group = useCreateGroup(prefill);
  const queryClient = useQueryClient();
  const [openSheet, setOpenSheet] = useState<CreateSheet | null>(null);
  const [renameCrew, setRenameCrew] = useState<Crew | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const close = () => setOpenSheet(null);
  const lengthText = lengthLabel(group.length);

  const rename = useMutation({
    mutationFn: () => {
      if (!renameCrew) {
        throw new Error('No crew');
      }
      return apiClient.renameCrew({
        crewId: renameCrew.id,
        name: renameValue.trim(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crews'] });
      setRenameCrew(null);
      setOpenSheet(null);
    },
  });

  function openRename(crew: Crew) {
    setRenameCrew(crew);
    setRenameValue(crew.name);
    setOpenSheet('rename');
  }

  return (
    <>
      <GroupPage
        dock={
          <>
            {group.hasFailed ? (
              <DeckSheetMessage message={CREATE_COPY.failed} testID="match-create-failed" />
            ) : null}
            <DeckButton
              glyph={group.hasSeated ? undefined : 'share'}
              label={group.hasSeated ? CREATE_COPY.ctaSeated : CREATE_COPY.cta}
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
          title={group.title.trim() || groupRuleTitle(group.rules)}
        >
          <GroupCardLine>{groupRuleBody(group.rules)}</GroupCardLine>
        </GroupCard>
        <View style={styles.titleField}>
          <Text style={styles.titleLabel}>{CREATE_COPY.contestTitle}</Text>
          <TextField
            maxLength={MATCH_TITLE_MAX}
            onChangeText={group.setTitle}
            placeholder={CREATE_COPY.contestTitlePlaceholder}
            testID="match-create-title"
            value={group.title}
          />
        </View>
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
            onPress={
              group.crews.length > 0 || group.people.length > 0
                ? () => setOpenSheet('crew')
                : undefined
            }
            testID="match-create-crew"
            value={whosInLabel(group.crews, group.whosIn)}
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
        crews={group.crews}
        onChange={group.chooseWhosIn}
        onClose={close}
        onRenameCrew={openRename}
        people={group.people}
        selection={group.whosIn}
        visible={openSheet === 'crew'}
      />
      <DeckSheetModal
        footer={
          <>
            <DeckButton
              disabled={renameValue.trim().length === 0}
              label={CREATE_COPY.renameCrewSave}
              loading={rename.isPending}
              onPress={() => rename.mutate()}
              testID="match-rename-crew-save"
            />
            <SheetDone onClose={close} />
          </>
        }
        onDismiss={close}
        testID="match-rename-crew-sheet"
        visible={openSheet === 'rename' && renameCrew !== null}
      >
        <DeckSheetTitle>{CREATE_COPY.renameCrewTitle}</DeckSheetTitle>
        <TextField
          maxLength={40}
          onChangeText={setRenameValue}
          placeholder={CREATE_COPY.renameCrewPlaceholder}
          testID="match-rename-crew-input"
          value={renameValue}
        />
      </DeckSheetModal>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    titleField: {
      marginTop: 14,
      gap: 8,
      paddingHorizontal: spacing.xs,
    },
    titleLabel: {
      color: theme.colors.muted,
      fontSize: 13.5,
      fontWeight: '600',
    },
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
